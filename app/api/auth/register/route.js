import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import Company from "@/models/Company";
import connectToDatabase from "@/lib/mongodb";
import { nanoid } from "nanoid";

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json(); // Ensure correct request body parsing
    const { name, email, password, role, companyName, companyId } = body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: "Email already in use!" }, { status: 400 });
    }

    let company = null;
    let newCompanyId = null;

    if (role === "admin") {
      newCompanyId = nanoid(8); // Generate an 8-character Company ID
      company = new Company({ name: companyName, companyId: newCompanyId });
      await company.save();
    } else {
      company = await Company.findOne({ companyId });
      if (!company) {
        return NextResponse.json({ message: "Invalid Company ID!" }, { status: 400 });
      }
    }

    // Use provided name or default to companyId
    const userName = name || company?.companyId;

    // Hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      _id: new mongoose.Types.ObjectId(), // Generate ObjectId manually
      name: userName,
      email,
      password: hashedPassword,
      role,
      companyId: company?.companyId || newCompanyId,
    });
    
    await newUser.save();
    

    return NextResponse.json(
      {
        message: "User registered successfully!",
        companyId: newCompanyId, // Return companyId for admins
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
