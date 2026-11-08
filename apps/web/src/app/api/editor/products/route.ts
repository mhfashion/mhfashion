import { NextResponse } from "next/server";
import { getEditorProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await getEditorProducts(48);
    return NextResponse.json({ products });
  } catch (error) {
    console.error("Editor product catalog unavailable:", error);
    return NextResponse.json(
      { error: "The product catalog is temporarily unavailable." },
      { status: 503 },
    );
  }
}
