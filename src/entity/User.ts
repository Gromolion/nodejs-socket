import {Entity, Column, PrimaryGeneratedColumn, OneToMany} from "typeorm"
import {Message} from "./Message";

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number


    @Column({unique: true})
    name: string

    @Column()
    password: string

    @Column({
        default: false
    })
    online: boolean

    @Column({
        default: null
    })
    socket: string

    @OneToMany(() => Message, (message) => message.user)
    messages: Message[]

    constructor(name: string, password: string) {
        this.name = name;
        this.password = password;
    }
}
