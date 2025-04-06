import "express-async-errors";
import { config } from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";

// Import routes
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.router.js";
import scheduleRoutes from "./routes/schedule.router.js";
import user from "./routes/user.js";
import studentSelectionRoutes from "./routes/studentSelectionRoutes.js";
import certificateRoutes from "./routes/certificate.routes.js"; // Add this import
import resumeRoutes from "./routes/resume.routes.js";
import testRoutes from "./routes/test.routes.js";
import companyRoutes from "./routes/company.routes.js"; // ✅ Company Routes
import applicationRoutes from "./routes/application.routes.js"; // ✅ Application Routes

// Import additional packages
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

// Load environment variables
config();

const app = express();

// Middleware configurations
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

// Enhanced CORS setup for production
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'https://your-production-frontend.com','https://cdpc-frontend.onrender.com'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// For reverse proxies (like Nginx)
app.set('trust proxy', 1);

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/schedules", scheduleRoutes);
app.use("/api/v1/user", user);
app.use("/api/v1/studentSelection", studentSelectionRoutes);
app.use("/api/v1/certificates", certificateRoutes);
app.use("/api/v1/resumes", resumeRoutes);
app.use("/api/v1/tests", testRoutes);
app.use("/api/v1/company", companyRoutes); // ✅ Added Company Routes
app.use("/api/v1/application", applicationRoutes); // ✅ Added Application Routes

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Database connection and server initialization
const PORT = process.env.PORT || 3100;
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("DB Connected");
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.log('UNHANDLED REJECTION! 💥 Shutting down...');
      console.error(err);
      server.close(() => {
        process.exit(1);
      });
    });
    
    // Handle SIGTERM signal
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
      server.close(() => {
        console.log('💥 Process terminated!');
      });
    });
  })
  .catch((error) => {
    console.error("Error connecting to the database:", error);
    process.exit(1);
  });

export { mongoose };
