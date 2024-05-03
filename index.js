const express = require("express");
const app = express();

const Datastore = require('nedb-promises');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerUi = require("swagger-ui-express");
const dotenv = require('dotenv');
const swaggerDocument = require('./swagger.json');



const usersDb = new Datastore({
    filename: "users.db",
    autoload: true,
});

const notesDb = new Datastore({
    filename: 'note.db',
    autoload: true,
});

dotenv.config();

const PORT = 3000;

app.use(express.json());


const setupSwagger = (app, PORT) => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


  app.get('/api/docs', swaggerUi.setup(swaggerDocument));
  console.log(`Swagger UI is available at http://localhost:${PORT}/api/docs`);
  opn(`http://localhost:${PORT}/api/docs`);
};



setupSwagger(app, PORT);
/* ******************************************************************************************* */




  const authToken = (req, res, next) => {
    try {
      const authHeader = req.headers["authorization"];
      if (!authHeader) return { status: 401, message: "Authorization header missing." };
    
      const token = authHeader.split(" ")[1];
      if (!token) return { status: 401, message: " token missing for authentication." };
    
      const key = process.env.JWT_SECRET;
    
      jwt.verify(token, key, (err, user) => {
        if (err) return { status: 401, message: "Invalid token." };
    
        req.user = user;
    
        next();
      });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, error: error.message || "Server error." });
    }
  };
  


/* ******************************************************************************************* */


app.post('/api/user/signup', async (req, res) => {
    try {


      const { username, password } = req.body;


      const cryptedPassword = await bcrypt.hash(password, 10);

  
        await usersDb.insert({ username, passwordHashed: cryptedPassword });
      res.status(201).json({ message: 'login success' });

    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error." });
    }
  });

/* ******************************************************************************************* */



app.post('/api/user/login', async (req, res) => {
    try {
      const { username, password } = req.body;
  
      const user = await usersDb.findOne({ username });
      if (!user) {
        return res.status(401).json({ error: 'wrong username try again' });
      }
  
      const validatePassword = await bcrypt.compare(password, user.passwordHashed);
      if (!validatePassword) {
        return res.status(401).json({ success: false, message: 'Invalid password' });
      }
  
      const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '3h' });
  
      // Return the token in the response
      return res.status(200).json({ success: true, token });
    } catch (error) {
      // Handle other errors
      console.error(error);
      res.status(500).json({ success: false, message: "Internal server error." });
    }
  });
  

/* ******************************************************************************************* */

app.get('/api/notes', authToken, async (req, res) => {
    try {
      const notes = await notesDb.find({});
      if (notes.length === 0) {
        return res.status(404).json({ success: false, message: "Could not find any notes" });
      }
  
      return res.status(200).json({ success: true, message: { notes: notes } });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  


/* ********************Create Notes*********************************************************************** */


app.post('/api/notes', authToken, async (req, res) => {
    try {
      const { title, text } = req.body;
  
      if (title.length > 50) {
        return res.status(400).json({ success: false, message: "Maximum length is 50 characters." });
      }
  
      if (text.length > 300) {
        return res.status(400).json({ success: false, message: "Maximum length is 300 characters." });
      }
  
     
      const note = await notesDb.insert({
        title: title,
        text: text,
      
        createdAt: new Date(),
        modifiedAt: new Date(),
      });
  
      if (!note) {
        return res.status(500).json({ success: false, message: "Internal server error" });
      }
  
      return res.status(201).json({ message: 'Note created' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  





/* **********************************update notes********************************************************* */




app.put('/api/notes', authToken, async (req, res) => {
    try {
      const { title, text } = req.body;
      const { id } = req.query;
  
      if (title.length > 50) {
        return res.status(400).json({ error: 'too long title' });
      }
      if (text.length > 300) {
        return res.status(400).json({ error: 'too long text' });
      }
  
      const updateNote = await notesDb.update({ _id: id }, { $set: { title, text, modifiedAt: new Date() } });
  
      // Check if the note was updated successfully
      if (!updateNote) {
        return res.status(500).json({ error: 'Internal server error' });
      }
  
      // Send the response
      return res.status(201).json({ success: true, message: "Note updated.", updateNote });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  

/* **********************************Delete Notes********************************************************* */

/* We first attempt to remove the note.
Then we check if deleteNote is not equal to 1. If it's not 1, 
it means no note was deleted  */

app.delete('/api/notes', authToken, async (req, res) => {
    try {
      const { id } = req.query;
  
      const deleteNote = await notesDb.remove({ _id: id });
  
      if (deleteNote !== 1) {
        return { status: 404, json: { success: false, message: "Note not found." }};

      } else {
        return { status: 200, json: { success: true, message: "Note deleted." } };
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  

/* ******************************************************************************************* */


  app.get("/api/notes/search", authToken, async (req, res) => {


    try {
        const locatedNotes = await notesDb.find({ title: { $regex: new RegExp(query, "i") } });
        if (locatedNotes.length === 0) {
            return { status: 404, json: { success: false, message: "did not find any Notes" } };
        }
        return { status: 200, json: { success: true, message: { notes: locatedNotes } } };
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
});








/* ******************************************************************************************* */

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
