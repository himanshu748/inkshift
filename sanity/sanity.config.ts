import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { schemaTypes } from "./schemaTypes";
export default defineConfig({
  name: "inkshift",
  title: "INKSHIFT · Content Lake",
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? "a5xdqsb7",
  dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  plugins: [structureTool()],
  schema: { types: schemaTypes, templates: [] },
  // All writes go through the application's transactional checks. Studio is an inspector.
  document: { actions: [] },
});
