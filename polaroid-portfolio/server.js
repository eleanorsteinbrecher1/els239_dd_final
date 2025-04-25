// server.js

// 1. Imports & setup
const express    = require('express');
const bodyParser = require('body-parser');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const { sequelize, Category, Photo } = require('./models');

const app = express();

// multer config: preserve original extension
const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});
const upload = multer({ storage });

// 2. Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public',  express.static(path.join(__dirname, 'public')));

// 3. Handlebars setup (with `inc` helper)
const exphbs = require('express-handlebars');
app.engine('handlebars', exphbs.engine({
  helpers: {
    inc: v => parseInt(v, 10) + 1
  }
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// 4. Auto-sync database
sequelize.sync();

// 5. Make categories available in EVERY view
app.use(async (req, res, next) => {
  res.locals.categories = await Category.findAll({ order: [['name','ASC']], raw: true });
  next();
});

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// Home: show *all* photos (no limit)
app.get('/', async (req, res) => {
  const photos = await Photo.findAll({
    order: [['createdAt','DESC']],
    include: Category,
    raw: true,
    nest: true
  });
  res.render('home', { photos });
});

// Upload form
app.get('/upload', (req, res) => res.render('upload'));
app.post('/upload', upload.single('photo'), async (req, res, next) => {
  try {
    await Photo.create({
      title:      req.body.title,
      filepath:   `/uploads/${req.file.filename}`,
      CategoryId: req.body.category
    });
    res.redirect('/');
  } catch(err) {
    next(err);
  }
});

// ─── PHOTO CRUD ────────────────────────────────────────────────────────────────

// List & manage photos
app.get('/photos', async (req, res) => {
  const photos = await Photo.findAll({
    order: [['createdAt','DESC']],
    include: Category,
    raw: true,
    nest: true
  });
  res.render('photos', { photos });
});

// Edit photo
app.get('/photo/edit/:id', async (req, res) => {
  const photo = await Photo.findByPk(req.params.id, { raw: true });
  res.render('photoForm', { photo });
});
app.post('/photo/edit', upload.single('photo'), async (req, res, next) => {
  try {
    const photo = await Photo.findByPk(req.body.id);
    if (req.file) {
      // delete old file
      fs.unlink(path.join(__dirname, photo.filepath), () => {});
      photo.filepath = `/uploads/${req.file.filename}`;
    }
    photo.title      = req.body.title;
    photo.CategoryId = req.body.category;
    await photo.save();
    res.redirect('/photos');
  } catch(err) {
    next(err);
  }
});

// Delete photo
app.get('/photo/delete/:id', async (req, res, next) => {
  try {
    const photo = await Photo.findByPk(req.params.id);
    if (photo) {
      fs.unlink(path.join(__dirname, photo.filepath), () => {});
      await photo.destroy();
    }
    res.redirect('/photos');
  } catch(err) {
    next(err);
  }
});

// ─── CATEGORY CRUD ─────────────────────────────────────────────────────────────

app.get('/categories', async (req, res) => {
  const categories = await Category.findAll({ order: [['id','ASC']], raw: true });
  res.render('categories', { categories });
});
app.get('/category/create', (req, res) => res.render('categoryForm'));
app.post('/category/create', async (req, res) => {
  await Category.create({ name: req.body.name });
  res.redirect('/categories');
});
app.get('/category/edit/:id', async (req, res) => {
  const category = await Category.findByPk(req.params.id, { raw: true });
  res.render('categoryForm', { category });
});
app.post('/category/edit', async (req, res) => {
  await Category.update({ name: req.body.name }, { where: { id: req.body.id } });
  res.redirect('/categories');
});
app.get('/category/delete/:id', async (req, res) => {
  await Category.destroy({ where: { id: req.params.id } });
  res.redirect('/categories');
});

// ─── CATEGORY VIEW ────────────────────────────────────────────────────────────

app.get('/category/:id', async (req, res) => {
  const category = await Category.findByPk(req.params.id, { raw: true });
  const photos   = await Photo.findAll({
    where: { CategoryId: req.params.id },
    order: [['createdAt','DESC']],
    raw: true
  });
  res.render('category', { category, photos });
});

// ─── ERROR HANDLING ───────────────────────────────────────────────────────────

app.use((req, res) => res.status(404).send('Not found'));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Server error');
});

// ─── START SERVER ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
