import { NextResponse } from "next/server";
import { activeAdvertisement } from "@/lib/advertising/store";
export const runtime="nodejs";
export async function GET(){return NextResponse.json({advertisement:await activeAdvertisement()},{headers:{"Cache-Control":"no-store"}});}
