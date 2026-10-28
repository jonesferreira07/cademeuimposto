import { NextResponse } from "next/server";
import { AD_DURATION_DAYS,AD_PRICE_CENTS } from "@/lib/advertising/schema";
import { adStoreAvailable } from "@/lib/advertising/store";
import { adEmailAvailable,AD_CONTACT_EMAIL } from "@/lib/advertising/mail";
export const runtime="nodejs";
export function GET(){return NextResponse.json({priceCents:AD_PRICE_CENTS,durationDays:AD_DURATION_DAYS,available:adStoreAvailable(),receiptAvailable:adEmailAvailable(),contactEmail:AD_CONTACT_EMAIL,paymentConfirmation:"manual",publication:"manual"},{headers:{"Cache-Control":"no-store"}});}
