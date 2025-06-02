const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "elements.json");
const STATE_FILE = path.join(__dirname, "app_state.json");

// SECURE ACCESS CODES - Store these securely, not in frontend!
const ACCESS_CODES = {
  SPOOKY2024: "user",
  HALLOWEEN: "user",
  GHOSTLY: "user",
  PUMPKIN123: "user",
  ADMIN_PORTAL: "admin", // Special admin code
  MASTER_KEY: "admin", // Backup admin code
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve static files from public directory

// Initialize data files if they don't exist
async function initializeDataFiles() {
  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    // Elements file doesn't exist, create it with empty array
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
    console.log("Created new elements.json file");
  }

  try {
    await fs.access(STATE_FILE);
  } catch (error) {
    // State file doesn't exist, create it with default state
    const defaultState = {
      isLocked: false,
      finalElements: null,
      lockedAt: null,
    };
    await fs.writeFile(STATE_FILE, JSON.stringify(defaultState, null, 2));
    console.log("Created new app_state.json file");
  }
}

// Read elements from file
async function readElements() {
  try {
    const data = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading elements:", error);
    return [];
  }
}

// Write elements to file
async function writeElements(elements) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(elements, null, 2));
  } catch (error) {
    console.error("Error writing elements:", error);
    throw error;
  }
}

// Read app state from file
async function readAppState() {
  try {
    const data = await fs.readFile(STATE_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading app state:", error);
    return { isLocked: false, finalStory: null, lockedAt: null };
  }
}

// Write app state to file
async function writeAppState(state) {
  try {
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error("Error writing app state:", error);
    throw error;
  }
}

// Validate access code
function validateAccessCode(code, requiredRole = "user") {
  const role = ACCESS_CODES[code];
  if (!role) return false;

  if (requiredRole === "admin") {
    return role === "admin";
  }

  return role === "user" || role === "admin"; // Admin can access user features too
}

// Routes

// Get app status (for frontend to check if locked)
app.get("/api/status", async (req, res) => {
  try {
    const state = await readAppState();
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: "Failed to read app status" });
  }
});

// Authentication endpoint for login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { accessCode, userName } = req.body;

    // Check if app is locked
    const state = await readAppState();
    if (state.isLocked) {
      return res.status(423).json({
        error:
          "Element collection is complete. The final tale has been chosen!",
        isLocked: true,
        finalElements: state.finalElements,
      });
    }

    // Validate access code
    if (!validateAccessCode(accessCode, "user")) {
      return res
        .status(401)
        .json({ error: "Invalid access code. The spirits reject you..." });
    }

    // Validate username
    if (!userName) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Check if user already submitted
    const elements = await readElements();
    const existingElements = elements.find(
      (element) => element.user === userName,
    );
    if (existingElements) {
      return res.status(200).json({
        message: "Welcome back! Here are your submitted elements.",
        user: userName,
        role: ACCESS_CODES[accessCode],
        existingElements: existingElements,
        alreadySubmitted: true,
      });
    }

    res.json({
      message: "Login successful",
      user: userName,
      role: ACCESS_CODES[accessCode],
      alreadySubmitted: false,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Authentication endpoint for admin
app.post("/api/auth/admin", async (req, res) => {
  try {
    const { accessCode } = req.body;

    // Validate admin access code
    if (!validateAccessCode(accessCode, "admin")) {
      return res
        .status(401)
        .json({
          error: "Insufficient privileges. The ancient powers deny you...",
        });
    }

    res.json({
      message: "Admin access granted",
      role: "admin",
    });
  } catch (error) {
    console.error("Error during admin login:", error);
    res.status(500).json({ error: "Admin authentication failed" });
  }
});

// Get all elements (for admin)
app.get("/api/elements", async (req, res) => {
  try {
    const elements = await readElements();
    res.json(elements);
  } catch (error) {
    res.status(500).json({ error: "Failed to read elements" });
  }
});

// Submit new elements
app.post("/api/elements", async (req, res) => {
  try {
    // Check if app is locked
    const state = await readAppState();
    if (state.isLocked) {
      return res.status(423).json({
        error: "Element collection is complete. No more entries allowed.",
        isLocked: true,
      });
    }

    const { user, location, character, item } = req.body;

    // Validation
    if (!user || !location || !character || !item) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const elements = await readElements();

    // Check if user already submitted (double-check on backend)
    const existingElements = elements.find((element) => element.user === user);
    if (existingElements) {
      return res
        .status(409)
        .json({ error: "User has already submitted elements" });
    }

    // Add new elements
    const newElements = {
      user,
      location: location.trim(),
      character: character.trim(),
      item: item.trim(),
      timestamp: new Date().toISOString(),
      id: Date.now(), // Simple ID generation
    };

    elements.push(newElements);
    await writeElements(elements);

    console.log(`New elements submitted by ${user}`);
    res
      .status(201)
      .json({
        message: "Elements submitted successfully",
        elements: newElements,
      });
  } catch (error) {
    console.error("Error submitting elements:", error);
    res.status(500).json({ error: "Failed to submit elements" });
  }
});

// Check if user already submitted
app.get("/api/elements/check/:user", async (req, res) => {
  try {
    const { user } = req.params;
    const elements = await readElements();
    const existingElements = elements.find((element) => element.user === user);

    res.json({ exists: !!existingElements });
  } catch (error) {
    res.status(500).json({ error: "Failed to check user" });
  }
});

// Generate random element combinations with unique users
app.get("/api/elements/random", async (req, res) => {
  try {
    const elements = await readElements();

    if (elements.length === 0) {
      return res.status(400).json({ error: "No elements available" });
    }

    if (elements.length < 3) {
      return res
        .status(400)
        .json({
          error: "Need at least 3 different users to generate proper elements",
        });
    }

    // Get unique users for each element type
    const users = [...new Set(elements.map((s) => s.user))];

    if (users.length < 3) {
      return res
        .status(400)
        .json({
          error: "Need at least 3 different users to generate unique elements",
        });
    }

    // Shuffle users to get random selection
    const shuffledUsers = users.sort(() => Math.random() - 0.5);

    // Assign different users to each element
    const locationUser = shuffledUsers[0];
    const characterUser = shuffledUsers[1];
    const itemUser = shuffledUsers[2];

    // Get the specific elements from each user
    const locationElements = elements.find((s) => s.user === locationUser);
    const characterElements = elements.find((s) => s.user === characterUser);
    const itemElements = elements.find((s) => s.user === itemUser);

    const finalElements = {
      location: { text: locationElements.location, user: locationUser },
      character: { text: characterElements.character, user: characterUser },
      item: { text: itemElements.item, user: itemUser },
      generatedAt: new Date().toISOString(),
    };

    // Lock the app and save the final elements
    const state = {
      isLocked: true,
      finalElements: finalElements,
      lockedAt: new Date().toISOString(),
    };
    await writeAppState(state);

    console.log("Random elements generated and app locked:", finalElements);
    res.json(finalElements);
  } catch (error) {
    console.error("Error generating random elements:", error);
    res.status(500).json({ error: "Failed to generate random elements" });
  }
});

// Delete all elements and unlock app (admin reset)
app.delete("/api/elements", async (req, res) => {
  try {
    await writeElements([]);

    // Reset app state
    const resetState = {
      isLocked: false,
      finalElements: null,
      lockedAt: null,
    };
    await writeAppState(resetState);

    console.log("All elements have been reset and app unlocked");
    res.json({ message: "All elements deleted and app reset successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete elements" });
  }
});

// Export elements as CSV
app.get("/api/elements/export/csv", async (req, res) => {
  try {
    const elements = await readElements();

    if (elements.length === 0) {
      return res.status(400).json({ error: "No elements to export" });
    }

    // Create CSV content
    const headers = "User,Location,Character,Item,Timestamp\n";
    const csvContent =
      headers +
      elements
        .map(
          (element) =>
            `"${element.user}","${element.location}","${element.character}","${element.item}","${element.timestamp}"`,
        )
        .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="halloween-elements.csv"',
    );
    console.log("CSV export requested");
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: "Failed to export CSV" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    message: "🎃 Halloween Story Server is running!",
  });
});

// Start server
async function startServer() {
  await initializeDataFiles();
  app.listen(PORT, () => {
    console.log(
      `🎃 Halloween Element Collector running on http://localhost:${PORT}`,
    );
    console.log(`📁 Elements will be saved to: ${DATA_FILE}`);
    console.log(`📋 App state will be saved to: ${STATE_FILE}`);
    console.log(`🔐 Access codes configured securely on backend`);
    console.log(`👑 Admin codes: ADMIN_PORTAL, MASTER_KEY`);
    console.log(`👤 User codes: SPOOKY2024, HALLOWEEN, GHOSTLY, PUMPKIN123`);
  });
}

startServer().catch(console.error);
