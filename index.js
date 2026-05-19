const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

app.use(cors());

app.use(express.json());

const port = process.env.PORT;

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const run = async () => {
  try {
    await client.connect();

    const db = client.db("doctors");
    const doctorData = db.collection("doctorslist");
    const booking = db.collection("bookings");

    app.get("/doctor", async (req, res) => {
      const data = doctorData.find({ rating: 4.9 }).limit(3);
      const result = await data.toArray();
      res.send(result);
    });

    app.get("/doctors", async (req, res) => {
      const data = doctorData.find();
      const result = await data.toArray();
      res.send(result);
    });

    app.get("/doctors/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await doctorData.findOne(query);
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const book = req.body;
      const result = await booking.insertOne(book);
      res.send(result);
    });

    app.get("/bookings", async (req, res) => {
      const data = booking.find();
      const result = await data.toArray();
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } catch (error) {
    console.log(error);
  }
};

run();

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
