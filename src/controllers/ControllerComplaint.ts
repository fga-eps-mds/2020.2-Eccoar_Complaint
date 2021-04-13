import { Request, Response } from 'express';
import { Votes } from '@entity/Votes';
import { Complaint } from '@entity/Complaint';
import { ComplaintRepository } from '@repositories/ComplaintRepository';
import { VotesRepository } from '@repositories/VotesRepository';
import ComplaintVoteConfirmed from '@utils/ComplaintVoteConfirmed';
import { ComplaintVote } from '@utils/ComplaintVote';
import ComplaintUpvote from '@utils/ComplaintUpvote';
import { Category } from '@utils/Category';
import { S3Service } from '@services/S3Service';

export default class ControllerComplaint {
	complaintRepository: ComplaintRepository;
	voteRepository: VotesRepository;
	s3Service: S3Service;

	constructor() {
		this.complaintRepository = new ComplaintRepository();
		this.voteRepository = new VotesRepository();
		this.s3Service = new S3Service();
	}

	private async checkComplaintExist(complaintId: number): Promise<Complaint> {
		const complaint = await this.complaintRepository.getById(complaintId);
		if (complaint == undefined || complaint == null) {
			throw new Error('Complaint not found');
		}
		return complaint;
	}

	private queryValidator(fields: string[], req: Request) {
		const missingFields: string[] = [];
		fields.forEach((field) => {
			if (!(field in req.body)) missingFields.push(field);
		});

		return missingFields;
	}

	private buildVoteType(typeVote: string): ComplaintVote {
		if (typeVote == 'complaintConfirmed') {
			return new ComplaintVoteConfirmed();
		}
		return new ComplaintUpvote();
	}

	async pong(req: Request, res: Response): Promise<void> {
		const pingPong = {
			ping: 'pong',
		};
		res.status(200).json(pingPong);
	}

	async create(req: Request, res: Response): Promise<Response> {
		try {
			const fields = [
				'name',
				'description',
				'latitude',
				'longitude',
				'userId',
				'category',
			];

			const missingFields = this.queryValidator(fields, req);

			if (missingFields.length > 0) {
				return res
					.status(400)
					.json({ msg: `Missing fields [${missingFields}]` });
			}
			if (req.body.picture) {
				const url = await this.s3Service.uploadImage(req.body.picture);
				req.body.picture = url.Location;
			}

			const complaint: Complaint = Object.assign(
				new Complaint(),
				req.body,
			);
			await this.complaintRepository.createComplaint(complaint);
			return res.sendStatus(201);
		} catch (error) {
			return res.status(400).json({ msg: error });
		}
	}

	async delete(req: Request, res: Response): Promise<Response> {
		try {
			const complaint = await this.complaintRepository.getById(Number(req.query.id));
			if (Number(complaint.userId) == Number(req.query.userId)) {
				await this.complaintRepository.deleteComplaint(complaint);
				return res.status(200).json({ msg: 'OK' });
			}
			else {
				res.status(403).json({ msg: 'User has not permission to delete this complaint!' });
			}
		}
		catch (error) {
			return res.status(400).json({ msg: error });
		}
	}

	async complaints(req: Request, resp: Response): Promise<void> {
		try {
			const response = await this.complaintRepository.getAllComplaints(
				Number(req.query.skip),
				Number(req.query.take),
				String(req.query.orderDate),
			);
			resp.status(200).json(response);
		} catch (error) {
			resp.status(400);
			resp.json({
				error,
			});
		}
	}

	async complaintWithVote(req: Request, resp: Response): Promise<void> {
		try {
			const response = await this.complaintRepository.getComplaintById(
				Number(req.query.userId),
				Number(req.query.complaintId),
			);
			resp.status(200).json(response);
		} catch (error) {
			resp.status(400);
			resp.json({
				error,
			});
		}
	}

	async addVote(req: Request, res: Response): Promise<Response> {
		const fields = ['userId', 'complaintId', 'typeVote'];
		const missingFields = this.queryValidator(fields, req);
		if (missingFields.length > 0) {
			return res
				.status(400)
				.json({ msg: `Missing fields [${missingFields}]` });
		}
		try {
			const complaint = await this.checkComplaintExist(
				req.body.complaintId,
			);
			const vote: Votes = Object.assign(new Votes(), req.body);
			await this.voteRepository.saveVote(vote, (error) => {
				res.status(400).json({ error: error.message });
			});
			const countVotes = await this.voteRepository.countVotesInComplaint(
				req.body.complaintId,
				req.body.typeVote,
			);
			const complaintVote = this.buildVoteType(String(req.body.typeVote));
			complaintVote.validateVote(
				countVotes,
				complaint,
				this.complaintRepository,
			);
			return res.sendStatus(200);
		} catch (error) {
			return res.status(400).json({ error: error.message });
		}
	}

	async getUserVote(req: Request, res: Response): Promise<Response> {
		const userId = req.query.userId;
		const skip = 0;
		const take = 0;
		try {
			if (userId == null || userId == undefined) {
				throw new Error('User not found');
			}
			const userVotes = await this.complaintRepository.getComplaintsWithVotes(
				Number(userId),
				skip,
				take,
			);
			return res.status(200).json(userVotes);
		} catch (error) {
			return res.status(400).json({ error: error.message });
		}
	}

	async waitComplaintsByCategory(
		req: Request,
		res: Response,
	): Promise<Response> {
		try {
			if (req.query.category == null || req.query.category === '') {
				throw new Error('Category is missing');
			}
			const response = await this.complaintRepository.getWaitComplaints(
				String(req.query.category) as Category,
			);
			return res.status(200).json(response);
		} catch (error) {
			return res.status(400).json({ error: error.message });
		}
	}
}
