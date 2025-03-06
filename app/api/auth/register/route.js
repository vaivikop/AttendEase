import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import Company from "@/models/Company";
import connectDB from "@/lib/mongodb";
import { nanoid } from "nanoid";

export async function POST(req) {
  try {
    await connectDB();
    const { name, email, password, role, companyName, companyId } = await req.json();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: "Email already in use!" }, { status: 400 });
    }

    let company = null;
    if (role === "admin") {
      const newCompanyId = nanoid(8); // Generate 8-char Company ID
      company = new Company({ name: companyName, companyId: newCompanyId });
      await company.save();
    } else {
      company = await Company.findOne({ companyId });
      if (!company) {
        return NextResponse.json({ message: "Invalid Company ID!" }, { status: 400 });
      }
    }

    // Set name to companyId if name is not provided
    const userName = name || company.companyId;

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name: userName, // Use the computed name
      email,
      password: hashedPassword,
      role,
      companyId: company?.companyId,
    });

    await newUser.save();
    return NextResponse.json({ message: "User registered successfully!" }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}