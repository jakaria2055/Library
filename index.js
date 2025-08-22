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
    app.post("/createBook", async (req, res) => {
      try {
        const book = req.body;
        book.createdAt = new Date();
        const result = await bookCollections.insertOne(book);
        res.status(201).json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get("/getBooks", async (req, res) => {
      try {
        let result = await bookCollections.find().toArray();
        res.status(200).json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

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

    app.delete("/delete/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };

        const result = await bookCollections.deleteOne(filter);
        res.status(200).json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });


    
  } catch (error) {
    console.log(error.json());
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
