import { query } from '../db';
import type { Client } from '../types';

export async function getAllClients(): Promise<Client[]> {
  try {
    const result = await query(`
      SELECT id, name, address, contact_person, contact_email, contact_phone, created_at, updated_at
      FROM clients
      ORDER BY name
    `);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      address: row.address,
      contactPerson: row.contact_person,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      authorizedCrewChiefIds: [], // Will be populated separately if needed
      contactUserIds: [], // Will be populated separately if needed
    }));
  } catch (error) {
    console.error('Error getting all clients:', error);
    return [];
  }
}

export async function getClientById(id: string): Promise<Client | null> {
  try {
    const result = await query(`
      SELECT id, name, address, contact_person, contact_email, contact_phone
      FROM clients
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    // Get authorized crew chiefs
    const crewChiefsResult = await query(`
      SELECT crew_chief_id FROM job_authorizations ja
      JOIN jobs j ON ja.job_id = j.id
      WHERE j.client_id = $1
    `, [id]);
    
    // Get contact user IDs
    const contactUsersResult = await query(`
      SELECT user_id FROM client_user_links
      WHERE client_id = $1
    `, [id]);

    return {
      id: row.id,
      name: row.name,
      address: row.address,
      contactPerson: row.contact_person,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      authorizedCrewChiefIds: crewChiefsResult.rows.map(r => r.crew_chief_id),
      contactUserIds: contactUsersResult.rows.map(r => r.user_id),
    };
  } catch (error) {
    console.error('Error getting client by ID:', error);
    return null;
  }
}

export async function createClient(clientData: Omit<Client, 'id' | 'authorizedCrewChiefIds' | 'contactUserIds'>): Promise<Client | null> {
  try {
    const result = await query(`
      INSERT INTO clients (name, address, contact_person, contact_email, contact_phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, address, contact_person, contact_email, contact_phone
    `, [
      clientData.name,
      clientData.address,
      clientData.contactPerson,
      clientData.contactEmail,
      clientData.contactPhone
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      contactPerson: row.contact_person,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      authorizedCrewChiefIds: [],
      contactUserIds: [],
    };
  } catch (error) {
    console.error('Error creating client:', error);
    return null;
  }
}

export async function updateClient(id: string, clientData: Partial<Omit<Client, 'id' | 'authorizedCrewChiefIds' | 'contactUserIds'>>): Promise<Client | null> {
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (clientData.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(clientData.name);
    }
    if (clientData.address !== undefined) {
      fields.push(`address = $${paramCount++}`);
      values.push(clientData.address);
    }
    if (clientData.contactPerson !== undefined) {
      fields.push(`contact_person = $${paramCount++}`);
      values.push(clientData.contactPerson);
    }
    if (clientData.contactEmail !== undefined) {
      fields.push(`contact_email = $${paramCount++}`);
      values.push(clientData.contactEmail);
    }
    if (clientData.contactPhone !== undefined) {
      fields.push(`contact_phone = $${paramCount++}`);
      values.push(clientData.contactPhone);
    }

    if (fields.length === 0) {
      return await getClientById(id);
    }

    values.push(id);
    const result = await query(`
      UPDATE clients
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, address, contact_person, contact_email, contact_phone
    `, values);

    if (result.rows.length === 0) {
      return null;
    }

    return await getClientById(id);
  } catch (error) {
    console.error('Error updating client:', error);
    return null;
  }
}

export async function deleteClient(id: string): Promise<boolean> {
  try {
    const result = await query('DELETE FROM clients WHERE id = $1', [id]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting client:', error);
    return false;
  }
}
