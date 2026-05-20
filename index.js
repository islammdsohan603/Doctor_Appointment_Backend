const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { jwtVerify, createRemoteJWKSet } = require("jose-cjs");

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

const jwks = createRemoteJWKSet(new URL("http://localhost:3000/api/auth/jwks"));

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { payload } = await jwtVerify(token, jwks);

    req.user = payload;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid Token" });
  }
};

const run = async () => {
  try {
    await client.connect();

    const db = client.db("doctors");
    const doctorData = db.collection("doctorslist");
    const booking = db.collection("bookings");
    const usersCollection = db.collection("users");

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

    app.get("/doctors/:id", verifyToken, async (req, res) => {
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
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;

      const updataBooking = req.body;

      const query = { _id: new ObjectId(id) };

      const updatedDoc = {
        $set: updataBooking,
      };

      const result = await booking.updateOne(query, updatedDoc);

      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await booking.deleteOne(query);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;

      const existingUser = await usersCollection.findOne({
        email: user.email,
      });

      if (existingUser) {
        return res.send({
          message: "User already exists",
        });
      }

      const result = await usersCollection.insertOne(user);

      res.send(result);
    });

    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;

      const updataData = req.body;

      const query = { _id: new ObjectId(id) };

      const updataDoc = {
        $set: updataData,
      };

      const result = await usersCollection.updateOne(query, updataDoc);

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
