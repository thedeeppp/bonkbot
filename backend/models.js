import mongoose from 'mongoose';

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/bonkbot";

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Connected to MongoDB");
}).catch((err) => {
  console.error("Error connecting to MongoDB:", err.message);
});

// Define the Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  privateKey: { type: String, required: true },
  publicKey: { type: String, required: true },
});

// Create the Model
const userModel = mongoose.model('User', userSchema);

// Export the Model
export { userModel };
