// Function to convert Google Sheet CSV data to the application's internal format
function processSheetData(data) {
    const members = {};
    const links = [];
    let startNodeId = null;

    // 1. Parse Members
    data.forEach((row, index) => {
        // Clean up keys (trim whitespace)
        const cleanRow = {};
        for (let key in row) {
            cleanRow[key.trim()] = row[key].trim();
        }

        // Ensure ID exists
        if (!cleanRow.id) return;
        
        // Set first valid ID as start node if not set
        if (!startNodeId) startNodeId = cleanRow.id;

        members[cleanRow.id] = {
            "id": cleanRow.id,
            "name": cleanRow.name || "",
            "baba": cleanRow.father_name || "", // Optional: kept for display consistency if used
            "anne": cleanRow.mother_name || "", // Optional: kept for display consistency if used
            "birth_date": cleanRow.birth_date || "",
            "birthplace": cleanRow.birthplace || "",
            "death_date": cleanRow.death_date || "",
            "image_path": (cleanRow.image_path || "").replace(/\\/g, "/").trim(),
            // Internal fields for graph construction
            "_father_id": cleanRow.father_id || null,
            "_mother_id": cleanRow.mother_id || null
        };
        
        // Add extra fields for the info panel if they exist in the sheet
        const extraFields = ["occupation", "note", "marriage", "second_names"];
        extraFields.forEach(field => {
            if (cleanRow[field]) members[cleanRow.id][field] = cleanRow[field];
        });
    });

    // 2. Generate Unions and Links
    const unions = {}; // Key: "fatherID_motherID", Value: UnionNodeID

    // Helper to get or create a union node
    function getUnionId(fatherId, motherId) {
        // Normalize keys to handle missing parents gracefully
        // We use specific string prefixes to avoid collision with user IDs
        const f = fatherId || "unknown_f";
        const m = motherId || "unknown_m";
        const key = `${f}_${m}`;

        if (!unions[key]) {
            // Create a unique ID for the union
            const unionId = "u_" + key;
            unions[key] = unionId;
            
            // Link parents to this union
            if (fatherId && members[fatherId]) {
                links.push([fatherId, unionId]);
            }
            if (motherId && members[motherId]) {
                links.push([motherId, unionId]);
            }
        }
        return unions[key];
    }

    Object.values(members).forEach(member => {
        const fId = member._father_id;
        const mId = member._mother_id;

        // If member has at least one known parent, link them to a union
        if (fId || mId) {
            const unionId = getUnionId(fId, mId);
            // Link Union -> Child
            links.push([unionId, member.id]);
        }
    });

    return {
        "start": startNodeId,
        "members": members,
        "links": links
    };
}

async function loadFromGoogleSheet(url) {
    try {
        // Use D3 to fetch the CSV
        const data = await d3.csv(url);
        if (!data || data.length === 0) {
            throw new Error("No data found in the CSV.");
        }
        
        const processedData = processSheetData(data);
        console.log("Loaded and processed data:", processedData);
        return processedData;
    } catch (error) {
        console.error("Error loading sheet:", error);
        alert("Error loading data from Google Sheet.\n\nCheck the console for details.\nEnsure the link is a valid 'Published to Web' CSV link.");
        throw error;
    }
}
