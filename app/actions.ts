"use server";

import { db } from "../db";
import { bills, householdUsage } from "../schema";
import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface SaveBillInput {
  month: string;
  totalAmount: number;
  totalKwh: number;
  kwhTret: number;
  kwhLau: number;
}

/**
 * Saves a new bill and its household splits within an ACID transaction.
 */
export async function saveBillAction(input: SaveBillInput) {
  try {
    await db.transaction(async (tx) => {
      // 1. Insert the main bill row
      const [insertedBill] = await tx
        .insert(bills)
        .values({
          month: input.month,
          totalAmount: input.totalAmount,
          totalKwh: String(input.totalKwh),
        })
        .returning({ id: bills.id });

      // 2. Insert the sub-meter usage rows linked to the main bill
      await tx.insert(householdUsage).values([
        {
          billId: insertedBill.id,
          householdName: "Hộ Trệt",
          kwhUsed: String(input.kwhTret),
        },
        {
          billId: insertedBill.id,
          householdName: "Hộ Lầu",
          kwhUsed: String(input.kwhLau),
        },
      ]);
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to save bill:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Retrieves all bills along with their household usages ordered by creation date descending.
 */
export async function getBillsAction() {
  try {
    const list = await db.query.bills.findMany({
      with: {
        usages: true,
      },
      orderBy: [desc(bills.createdAt)],
    });
    
    return { 
      success: true, 
      data: list.map(bill => ({
        ...bill,
        totalKwh: parseFloat(bill.totalKwh),
        usages: bill.usages.map(usage => ({
          ...usage,
          kwhUsed: parseFloat(usage.kwhUsed)
        }))
      }))
    };
  } catch (error) {
    console.error("Failed to fetch bills:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}

/**
 * Deletes a bill (automatically cascades to its household usages).
 */
export async function deleteBillAction(billId: number) {
  try {
    await db.delete(bills).where(eq(bills.id, billId));
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete bill:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" };
  }
}
