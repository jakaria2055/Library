import express from "express";
import cors from "cors";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const URI = process.env.MONGO_URI;

const client = new MongoClient(URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("Database connected Successfully.");

    //Buiseness Logic
    const bookCollections = client.db("libraryDB").collection("books");
    const userCollection = client.db("libraryDB").collection("users");
    const userBorrowBookCollections = client
      .db("userInfoDB")
      .collection("userInfo");
    const borrowBookCollections = client
      .db("bookBorrowPageDB")
      .collection("borrowBooksPage");

    //UNIQUE EMAIL FOR USER
    await userCollection.createIndex({ email: 1 }, { unique: true });

    //***********BOOKS CRUD**************

    //CREATE BOOK
    app.post("/createBook", async (req, res) => {
      try {
        const book = req.body;
        book.createdAt = new Date();
        if (book.bookQuantity != null) {
          const q = Number(book.bookQuantity);
          if (!Number.isInteger(q) || q < 0) {
            return res.status(400).json({
              success: false,
              message: "bookQuantity must be a non-negative integer",
            });
          }
          book.bookQuantity = q;
        }
        const result = await bookCollections.insertOne(book);
        res.status(201).json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    //GET ALL BOOKS
    app.get("/getBooks", async (req, res) => {
      try {
        let result = await bookCollections.find().toArray();
        res.status(200).json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    //GET BOOK BY ID
    app.get("/bookbyID/:id", async (req, res) => {
      try {
        const id = req?.params?.id;
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid Book ID" });
        }
        const isMatch = { _id: new ObjectId(id) };
        const result = await bookCollections.findOne(isMatch);

        if (!result) {
          return res
            .status(404)
            .json({ success: false, message: " Book not found" });
        }

        res.status(200).json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    //UPDATE SPECIFIC BOOK
    app.put("/bookUpdate/:id", async (req, res) => {
      try {
        const id = req?.params?.id;
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid Book ID" });
        }
        const data = req.body;
        const filter = { _id: new ObjectId(id) };

        if (data.bookQuantity != null) {
          const q = Number(data.bookQuantity);
          if (!Number.isInteger(q) || q < 0) {
            return res.status(400).json({
              success: false,
              message: "BookQuantity must be a non-negative integer",
            });
          }
        }

        const updatedBook = {
          $set: {
            image: data.image,
            title: data.title,
            writer: data.writer,
            published: data.published,
            category: data.category,
            shortDes: data.shortDes,
            updatedAt: new Date(),
          },
        };
        const result = await bookCollections.updateOne(filter, updatedBook);

        if (result.matchedCount === 0) {
          return res
            .status(400)
            .json({ success: false, message: "Book not found" });
        }

        if (!result) {
          return res
            .status(404)
            .json({ success: false, message: " Book not found" });
        }

        res.status(200).json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    //UPDATE BOOK QUANTITY ONLY
    app.patch("//bookUpdate/:id/quantity", async (req, res) => {
      try {
        const id = req.params;
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid book ID" });
        }

        const { quantity } = req.body;
        if (
          typeof quantity !== "number" ||
          !Number.isInteger(quantity) ||
          quantity < 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Quantity must be in integer positive number",
          });
        }

        const result = await bookCollections.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: { bookQuantity: quantity, updatedAt: new Date() },
          }
        );

        if (result.matchedCount === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Book not found" });
        }
        res.status(200).json({
          success: true,
          data: {
            matched: result.matchedCount,
            modified: result.modifiedCount,
          },
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    //DELETE BOOK SPECIFICALLY
    app.delete("/delete/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid book ID" });
        }
        const filter = { _id: new ObjectId(id) };

        const result = await bookCollections.deleteOne(filter);
        if (result.deletedCount === 0) {
          return res
            .status(404)
            .json({ success: false, message: "Book not found" });
        }
        res
          .status(200)
          .json({ success: true, message: "Book deleted successfully" });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    //**********USER OPERATION***************//
    //REGISTER USER

    app.post("/user/register", async (req, res) => {
      try {
        const { name, email, password } = req.body || {};
        if (!name || !email || !password) {
          return res.status(400).json({
            success: false,
            message: "Name, E-mail, Password are required",
          });
        }
        const doc = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          createdAt: new Date(),
        };
        const r = await userCollection.insertOne(doc);
        return res.status(201).json({
          success: true,
          data: { _id: r.insertedId, name: doc.name, email: doc.email },
        });
      } catch (error) {
        if (error?.code === 11000) {
          return res
            .status(409)
            .json({ success: false, message: "Email already registered." });
        }
        return res.status(500).json({ success: false, message: err.message });
      }
    });

    //USER LOGIN
    app.post("/user/login", async (req, res) => {
      try {
        const { email, password } = req.body || {};
        if (!email || !password) {
          return res.status(400).json({
            success: false,
            message: "Email & Password are required.",
          });
        }

        const user = await userCollection.findOne({
          email: email.trim().toLowerCase(),
          password,
        });

        if (!user) {
          return res
            .status(401)
            .json({ success: false, message: "Invalid Email or Password" });
        }
        return res.json({
          success: true,
          data: { _id: user._id, name: user.name, email: user.email },
        });
      } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
      }
    });

    //CREATE: ADD USER BORROWING INFORMATION
    app.post("/createUser-info", async (req, res) => {
      try {
        const userInformation = req.body;
        userInformation.createdAt = new Date();

        const result = await userBorrowBookCollections.insertOne(
          userInformation
        );
        res
          .status(201)
          .json({ success: true, data: { insertedId: result.insertedId } });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    //GET ALL USER INFORMATION
    app.get("/getUser-info", async (req, res) => {
      try {
        const result = await userBorrowBookCollections.find().toArray();
        res.status(200).json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    //********BORROWED BOOKS************//
    //BORROW A BOOKS
    app.post("/borrowed-books", async (req, res) => {
      try {
        const borrowBookData = req.body;
        if (
          !borrowBookData.bookId ||
          !ObjectId.isValid(borrowBookData.bookId)
        ) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid or missing bookId" });
        }

        const bookId = new ObjectId(borrowBookData.bookId);
        const book = await bookCollections.findOne({ _id: bookId });
        const availableQty = Number(book?.bookQuantity ?? 0);
        if (!book || availableQty < 1) {
          return res
            .status(400)
            .json({ success: false, message: "Book not available" });
        }

        borrowBookData.borrowedAt = new Date();
        borrowBookData.status = "borrowed";

        const session = client.startSession();
        let insertedId = null;
        try {
          await session.withTransaction(async () => {
            const insertRes = await borrowBookCollections.insertOne(
              borrowBookData,
              { session }
            );
            insertedId = insertRes.insertedId;
            await bookCollections.updateOne(
              { _id: bookId },
              { $inc: { bookQuantity: -1 }, $set: { updatedAt: new Date() } },
              { session }
            );
          });
        } finally {
          await session.endSession();
        }
        res.status(201).json({ success: true, data: { insertedId } });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    //GET BORROWED BOOKS
    app.get("/borrowed-books", async (req, res) => {
      try {
        const query = req.query?.email ? { email: req.query.email } : {};
        const result = await borrowBookCollections.find(query).toArray();
        res.status(200).json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    //GET SINGLE BORROWED RECORD
    app.get("/borrowed-books/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid Borrowed Bookk ID" });
        }
        const result = await borrowBookCollections.findOne({
          _id: new ObjectId(id),
        });
        if (!result) {
          return res.status(404).json({
            success: false,
            message: "Borrowed Book record not found!!!",
          });
        }
        res.status(200).json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.delete("/borrowed-books/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid Borrowed Book ID" });
        }

        const borrowRecord = await borrowBookCollections.findOne({
          _id: new ObjectId(id),
        });
        if (!borrowRecord) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid BOOK ID on Record" });
        }

        const session = client.startSession();
        try {
          await session.withTransaction(async () => {
            await borrowBookCollections.deleteOne(
              { _id: new ObjectId(id) },
              { session }
            );
            await bookCollections.updateOne(
              { _id: new ObjectId(borrowRecord.bookId) },
              { $inc: { bookQuantity: 1 }, $set: { updatedAt: new Date() } },
              { session }
            );
          });
        } finally {
          await session.endSession();
        }

        res
          .status(200)
          .json({ success: true, message: "Book returned successfully" });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });












    //HEALTH CHECK
        // Health check
    app.get("/health", async (_req, res) => {
      try {
        await client.db("admin").command({ ping: 1 });
        res.status(200).json({
          success: true,
          message: "Server and database are healthy",
          timestamp: new Date(),
        });
      } catch (_error) {
        res
          .status(500)
          .json({ success: false, message: "Database connection failed" });
      }
    });








  // ROOT ENDPOINTS
    app.get("/", (_req, res) => {
      res.json({
        message: "Library Management System API",
        version: "1.0.0",
        endpoints: {
          books: "/books",
          userInfo: "/user-info",
          borrowedBooks: "/borrowed-books",
          users: ["/users/register", "/users/login"],
          health: "/health",
        },
      });
    });
  } catch (error) {
    //final/main catch function
    res.status(500).json({ success: false, message: error.message });
  }
}

run();

app.get("/", (req, res) => {
  res.json({
    message: "Library Server Application",
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
