const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { jwtVerify, createRemoteJWKSet } = require("jose-cjs");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const uri = process.env.MONGO_URI;
const clientUrl = process.env.CLIENT_URL;

if (!uri) {
  throw new Error("MONGO_URI is missing.");
}

if (!clientUrl) {
  throw new Error("CLIENT_URL is missing.");
}

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
let doctorData;
let booking;
let usersCollection;

const jwks = createRemoteJWKSet(new URL(`${clientUrl}/api/auth/jwks`));

const connectDb = async () => {
  if (db) {
    return db;
  }

  await client.connect();
  db = client.db("doctors");
  doctorData = db.collection("doctorslist");
  booking = db.collection("bookings");
  usersCollection = db.collection("users");

  return db;
};

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await connectDb();
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

const toObjectId = (id) => {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return new ObjectId(id);
};

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

app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

app.get(
  "/health",
  asyncHandler(async (req, res) => {
    await db.command({ ping: 1 });
    res.json({ ok: true });
  }),
);

app.get(
  "/doctor",
  asyncHandler(async (req, res) => {
    const result = await doctorData.find({ rating: 4.9 }).limit(3).toArray();
    res.json(result);
  }),
);

app.get(
  "/doctors",
  asyncHandler(async (req, res) => {
    const result = await doctorData.find().toArray();
    res.json(result);
  }),
);

app.get(
  "/doctors/:id",
  asyncHandler(async (req, res) => {
    const objectId = toObjectId(req.params.id);

    if (!objectId) {
      return res.status(400).json({ message: "Invalid doctor id" });
    }

    const result = await doctorData.findOne({ _id: objectId });

    if (!result) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    res.json(result);
  }),
);

app.post(
  "/bookings",
  asyncHandler(async (req, res) => {
    const result = await booking.insertOne(req.body);
    res.json(result);
  }),
);

app.get(
  "/bookings",
  verifyToken,
  asyncHandler(async (req, res) => {
    const email = req.query.email;

    if (email !== req.user.email) {
      return res.status(403).json({ message: "Forbidden Access" });
    }

    const result = await booking.find({ email }).toArray();
    res.json(result);
  }),
);

app.patch(
  "/bookings/:id",
  asyncHandler(async (req, res) => {
    const objectId = toObjectId(req.params.id);

    if (!objectId) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const result = await booking.updateOne(
      { _id: objectId },
      { $set: req.body },
    );

    res.json(result);
  }),
);

app.delete(
  "/bookings/:id",
  asyncHandler(async (req, res) => {
    const objectId = toObjectId(req.params.id);

    if (!objectId) {
      return res.status(400).json({ message: "Invalid booking id" });
    }

    const result = await booking.deleteOne({ _id: objectId });
    res.json(result);
  }),
);

app.post(
  "/users",
  asyncHandler(async (req, res) => {
    const user = req.body;
    const existingUser = await usersCollection.findOne({ email: user.email });

    if (existingUser) {
      return res.json({ message: "User already exists" });
    }

    const result = await usersCollection.insertOne(user);
    res.json(result);
  }),
);

app.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const objectId = toObjectId(req.params.id);

    if (!objectId) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const result = await usersCollection.updateOne(
      { _id: objectId },
      { $set: req.body },
    );

    res.json(result);
  }),
);

app.use((error, req, res, next) => {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    message: "Internal server error",
  });
});

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}

module.exports = app;
