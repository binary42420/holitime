import { NextApiRequest, NextApiResponse } from "next"
import { withTransaction, query } from "@/lib/db"

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).end()
  }

  const { id } = req.query
  const { personnel } = req.body

  if (!id || !personnel) {
    return res.status(400).json({ error: "Missing id or personnel data" })
  }

  try {
    await withTransaction(async client => {
      // 1. Clear existing unassigned personnel for this shift
      await client.query(
        `DELETE FROM "AssignedPersonnel" WHERE "shiftId" = $1 AND "employeeId" IS NULL`,
        [id]
      )

      // 2. Create new personnel entries
      const newPersonnel = personnel.filter((p: any) => p.id.startsWith("new-"))
      if (newPersonnel.length > 0) {
        const values = newPersonnel.map((p: any) => `('${id}', '${p.roleCode}', '${p.roleOnShift}', 'not_started')`).join(",")
        await client.query(
          `INSERT INTO "AssignedPersonnel" ("shiftId", "roleCode", "roleOnShift", "status") VALUES ${values}`
        )
      }
      
      // 3. Update existing ones (if any were changed)
      const existingPersonnel = personnel.filter((p: any) => !p.id.startsWith("new-"))
      for (const p of existingPersonnel) {
        await client.query(
          `UPDATE "AssignedPersonnel" SET "employeeId" = $1 WHERE "id" = $2`,
          [p.employeeId, p.id]
        )
      }
    })

    res.status(200).json({ message: "Personnel updated successfully" })
  } catch (error) {
    console.error("Error updating personnel:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

export default handler
