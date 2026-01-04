import neo4j, { Driver, Session } from "neo4j-driver";

let driver: Driver | null = null;

export const initGraphDriver = () => {
    if (!driver) {
        const uri = process.env.NEO4J_URI;
        const username = process.env.NEO4J_USERNAME;
        const password = process.env.NEO4J_PASSWORD;

        if (!uri || !username || !password) {
            throw new Error("Missing Neo4j environment variables (NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD)");
        }

        driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
        console.log("🟢 Neo4j Driver Initialized");
    }
    return driver;
};

export const getGraphSession = (): Session => {
    const d = initGraphDriver();
    return d.session();
};

export const closeGraphDriver = async () => {
    if (driver) {
        await driver.close();
        driver = null;
        console.log("🔴 Neo4j Driver Closed");
    }
};
