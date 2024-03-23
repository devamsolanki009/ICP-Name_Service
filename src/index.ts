import express, { Request, Response, NextFunction } from "express";
import { Server, StableBTreeMap, ic } from "azle";
import { v4 as uuidv4 } from 'uuid';

// Define interfaces for data structures
interface NameRecord {
    id: string;
    name: string;
    owner: string;
    createdAt: Date;
    updatedAt: Date | null;
}

// Create a storage for name records
const nameRecordsStorage = new StableBTreeMap<string, NameRecord>(0);

// Middleware to validate input data for creating and updating name records
function validateNameRecord(req: Request, res: Response, next: NextFunction) {
    const { name, owner } = req.body;
    if (!name || !owner) {
        return res.status(400).send("Name and owner are required.");
    }
    next();
}

// Middleware to handle errors
function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    console.error(err);
    res.status(500).send("Internal Server Error");
}

// Define the server
export default Server(() => {
    const app = express();
    app.use(express.json());

    // Route to create a name record
    app.post("/names", validateNameRecord, (req, res) => {
        const { name, owner } = req.body;
        const existingRecord = nameRecordsStorage.get(name);
        if (existingRecord) {
            return res.status(409).send("Name already exists.");
        }
        const nameRecord: NameRecord = {
            id: uuidv4(),
            name,
            owner,
            createdAt: getCurrentDate(),
            updatedAt: null,
        };
        nameRecordsStorage.insert(nameRecord.name, nameRecord);
        res.json(nameRecord);
    });

    // Route to get all name records
    app.get("/names", (req, res) => {
        res.json(nameRecordsStorage.values());
    });

    // Route to get a name record by ID
    app.get("/names/:id", (req, res) => {
        const nameId = req.params.id;
        const nameRecord = nameRecordsStorage.get(nameId);
        if (!nameRecord) {
            return res.status(404).send(`Name with id=${nameId} not found.`);
        }
        res.json(nameRecord);
    });

    // Route to update a name record
    app.put("/names/:id", validateNameRecord, (req, res) => {
        const nameId = req.params.id;
        const { name, owner } = req.body;
        const nameRecord = nameRecordsStorage.get(nameId);
        if (!nameRecord) {
            return res.status(404).send(`Name with id=${nameId} not found.`);
        }
        const existingRecord = nameRecordsStorage.get(name);
        if (existingRecord && existingRecord.id !== nameId) {
            return res.status(409).send("Name already exists.");
        }
        nameRecord.name = name;
        nameRecord.owner = owner;
        nameRecord.updatedAt = getCurrentDate();
        nameRecordsStorage.insert(nameRecord.name, nameRecord);
        res.json(nameRecord);
    });

    // Route to delete a name record
    app.delete("/names/:id", (req, res) => {
        const nameId = req.params.id;
        const deletedNameRecord = nameRecordsStorage.remove(nameId);
        if (!deletedNameRecord) {
            return res.status(404).send(`Name with id=${nameId} not found.`);
        }
        res.json(deletedNameRecord);
    });

    // Error handling middleware
    app.use(errorHandler);

    return app.listen();
});

// Function to get the current date
function getCurrentDate(): Date {
    return new Date(ic.time().toBigInt() / BigInt(1000000));
}
