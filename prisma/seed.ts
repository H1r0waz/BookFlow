import { db } from "../server/db.js";
import { seedDemoBusiness } from "./demo.js";
try {
  for (const [slug, name, email] of [
    ["willow-studio", "Willow Studio", "demo@bookflow.example"],
    ["harbor-studio", "Harbor Studio", "harbor@bookflow.example"],
  ]) {
    const result = await seedDemoBusiness(slug, name, email);
    console.log(
      name +
        ": " +
        (result.created ? "fictional demo created" : "existing demo preserved"),
    );
  }
} finally {
  await db.$disconnect();
}
