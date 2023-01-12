import "reflect-metadata"
import { DataSource } from "typeorm"

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "db",
    port: 5432,
    username: "app",
    password: "app",
    database: "app",
    synchronize: true,
    logging: true,
    entities: [__dirname + "/entity/*.ts"],
    migrations: [],
    subscribers: [],
})
