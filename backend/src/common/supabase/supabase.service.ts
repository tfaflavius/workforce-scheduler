import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async signUp(email: string, password: string, metadata?: Record<string, any>) {
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async getUser(token: string) {
    const { data, error } = await this.supabase.auth.getUser(token);

    if (error) {
      throw error;
    }

    return data.user;
  }

  async deleteUser(userId: string) {
    const { error } = await this.supabase.auth.admin.deleteUser(userId);

    if (error) {
      throw error;
    }
  }

  async resetPasswordForEmail(email: string, redirectTo: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      throw error;
    }
  }

  async updateUserPassword(userId: string, newPassword: string) {
    const { error } = await this.supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      throw error;
    }
  }

  /**
   * Gaseste un user Supabase Auth dupa email (scaneaza paginat lista de admin).
   */
  private async findAuthUserByEmail(email: string): Promise<{ id: string; email?: string } | null> {
    const target = email.toLowerCase();
    const perPage = 200;
    for (let page = 1; page <= 25; page++) {
      const { data, error } = await this.supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users: any[] = (data as any)?.users || [];
      const match = users.find((u: any) => (u.email || '').toLowerCase() === target);
      if (match) return match;
      if (users.length < perPage) break; // ultima pagina
    }
    return null;
  }

  /**
   * Se asigura ca exista un user Supabase Auth pentru email si ii seteaza parola.
   * Il creeaza daca lipseste (email confirmat), altfel actualizeaza parola.
   * Folosit pentru conturile create de admin, care nu au acelasi id ca in Supabase.
   */
  async upsertUserByEmail(email: string, password: string, metadata?: Record<string, any>) {
    // Incearca sa creeze userul
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (!error) {
      return data.user;
    }

    // Exista deja -> gaseste-l dupa email si actualizeaza parola
    const existing = await this.findAuthUserByEmail(email);
    if (!existing) {
      throw error;
    }
    const { error: updateError } = await this.supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (updateError) {
      throw updateError;
    }
    return existing;
  }
}
