import {Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany} from "typeorm"
import {User} from "./User";

@Entity()
export class Message {

    @PrimaryGeneratedColumn()
    id: number

    @ManyToOne(() => User, (user) => user.messages, {
        eager: true
    })
    user: User

    @Column()
    text: string

    @Column({ type: "time" })
    time: string

    @ManyToOne(() => Message, (message) => message.children, {
        nullable: true
    })
    parent: Message

    @OneToMany(() => Message, (message) => message.parent, {
        nullable: true
    })
    children: Message[]

    constructor(user: User, text: string, time: string, parent?: Message) {
        this.user = user;
        this.text = text;
        this.time = time;
        this.parent = parent;
    }
}
