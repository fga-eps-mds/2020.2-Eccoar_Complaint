import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	OneToMany,
} from 'typeorm';
import { IsLatitude, IsLongitude } from 'class-validator';
import { Category } from '@utils/Category';
import { Status } from '@utils/Status';
import { Votes } from './Votes';

@Entity('tb_complaint')
export class Complaint {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({ length: 255, nullable: false })
	name: string;

	@Column({ length: 255, nullable: false })
	description: string;

	@Column({ nullable: false, type: 'double' })
	@IsLatitude()
	latitude: number;

	@Column({ nullable: false, type: 'double' })
	@IsLongitude()
	longitude: number;

	@Column({ nullable: false })
	userId: string;

	@Column({ type: 'enum', enum: Category, nullable: false })
	category: Category;

	@CreateDateColumn({ type: 'datetime', nullable: false })
	creationDate: string;

	@Column({ type: 'datetime', nullable: true })
	closeDate: string;

	@Column({ length: 255, nullable: true })
	picture: string;

	@Column({ nullable: false, default: 'open', type: 'enum', enum: Status })
	status: Status;

	@OneToMany(() => Votes, (vote) => vote.complaint, { cascade: true })
	votes: Votes[];
}
