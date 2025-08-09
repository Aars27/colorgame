import express from "express";
import adminController from "../controllers/adminController.js";

const router = express.Router();

router.post(
  "/listMember",
  // adminController.middlewareAdminController, // agar testing hai to comment
  adminController.listMember
);

export default router;
