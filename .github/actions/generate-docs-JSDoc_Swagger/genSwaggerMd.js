const fs = require("fs");
const path = require("path");
const SwaggerParser = require("swagger-parser");

const swaggerFile = process.argv[2]; // Pass swagger file path as CLI arg

if (!swaggerFile) {
    console.error("Usage: node generate-md-per-tag.js <swagger-file>");
    process.exit(1);
}

(async () => {
    try {
        const api = await SwaggerParser.dereference(swaggerFile);
        const tagsMap = {};

        for (const [route, methods] of Object.entries(api.paths)) {
            for (const [method, operation] of Object.entries(methods)) {
                const tags = operation.tags || ["untagged"];
                tags.forEach(tag => {
                    if (!tagsMap[tag]) tagsMap[tag] = [];
                    tagsMap[tag].push({ route, method: method.toUpperCase(), operation });
                });
            }
        }

        for (const [tag, endpoints] of Object.entries(tagsMap)) {
            const mdLines = [`# ${tag}\n`];
            endpoints.forEach(({ route, method, operation }) => {
                mdLines.push(`## ${method} ${route}`);
                mdLines.push(`**Summary**: ${operation.summary || "N/A"}`);
                mdLines.push("");
                mdLines.push(`**Description**: ${operation.description || "N/A"}`);
                mdLines.push("");

                if (operation.parameters && operation.parameters.length > 0) {
                    mdLines.push(`**Parameters:**`);
                    operation.parameters.forEach(param => {
                        mdLines.push(`- \`${param.name}\` in \`${param.in}\` — ${param.description || "No description"}`);
                    });
                    mdLines.push("");
                }

                // Request Body
                if (operation.requestBody?.content) {
                    mdLines.push(`**Request Body:**`);
                    for (const [type, body] of Object.entries(operation.requestBody.content)) {
                        const schema = body.schema;
                        if (schema) {
                            mdLines.push(`_Content-Type: ${type}_`);
                            mdLines.push("```json");
                            mdLines.push(JSON.stringify(schema, null, 2));
                            mdLines.push("```");
                        }
                    }
                }

                // Responses
                if (operation.responses) {
                    mdLines.push(`**Responses:**`);
                    Object.entries(operation.responses).forEach(([code, resp]) => {
                        mdLines.push(`- \`${code}\`: ${resp.description || "No description"}`);

                        if (resp.content) {
                            for (const [contentType, contentObj] of Object.entries(resp.content)) {
                                let example = contentObj.example;

                                // Check `examples` object
                                if (!example && contentObj.examples) {
                                    const first = Object.values(contentObj.examples)[0];
                                    example = first?.value;
                                }

                                // Fallback: build from schema with example fields
                                if (!example && contentObj.schema) {
                                    const buildExample = (schema) => {
                                        if (schema.example) return schema.example;
                                        if (schema.type === "object" && schema.properties) {
                                            const obj = {};
                                            for (const [key, prop] of Object.entries(schema.properties)) {
                                                obj[key] = buildExample(prop);
                                            }
                                            return obj;
                                        } else if (schema.type === "array" && schema.items) {
                                            return [buildExample(schema.items)];
                                        } else {
                                            return schema.default || schema.type || "example";
                                        }
                                    };
                                    example = buildExample(contentObj.schema);
                                }

                                // Add example if found
                                if (example) {
                                    mdLines.push(`\n**Example (${contentType}):**`);
                                    mdLines.push("```json");
                                    mdLines.push(JSON.stringify(example, null, 2));
                                    mdLines.push("```");
                                }
                            }
                        }
                    });
                }

                mdLines.push("\n---\n");
            });

            const filename = `./docs/api/md/${tag.replace(/\s+/g, "_").toLowerCase()}.md`;
            const outputDir = path.join(__dirname, 'md');

            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            fs.writeFileSync(filename, mdLines.join("\n"), "utf8");
            console.log(`✅ Generated: ${filename}`);
        }
    } catch (err) {
        console.error("❌ Error:", err);
    }
})();
