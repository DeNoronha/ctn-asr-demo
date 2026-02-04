import type axiosLib from "axios";
import type { Contact, ContactRequest, UpdateContactRequest } from "../types";

export class ContactsEndpoint {
	constructor(private axios: ReturnType<typeof axiosLib.create>) {}

	/**
	 * Get contacts for a legal entity
	 */
	async getByLegalEntity(legalEntityId: string): Promise<Contact[]> {
		const { data } = await this.axios.get<Contact[]>(
			`/legal-entities/${legalEntityId}/contacts`,
		);
		return data;
	}

	/**
	 * Get contact by ID
	 */
	async getById(legalEntityId: string, contactId: string): Promise<Contact> {
		const { data } = await this.axios.get<Contact>(
			`/legal-entities/${legalEntityId}/contacts/${contactId}`,
		);
		return data;
	}

	/**
	 * Create contact for legal entity
	 */
	async create(
		legalEntityId: string,
		contact: ContactRequest,
	): Promise<Contact> {
		const { data } = await this.axios.post<Contact>(
			`/legal-entities/${legalEntityId}/contacts`,
			contact,
		);
		return data;
	}

	/**
	 * Update contact
	 */
	async update(
		legalEntityId: string,
		contactId: string,
		updates: UpdateContactRequest,
	): Promise<Contact> {
		const { data } = await this.axios.put<Contact>(
			`/legal-entities/${legalEntityId}/contacts/${contactId}`,
			updates,
		);
		return data;
	}

	/**
	 * Delete contact
	 */
	async delete(legalEntityId: string, contactId: string): Promise<void> {
		await this.axios.delete(
			`/legal-entities/${legalEntityId}/contacts/${contactId}`,
		);
	}
}
