// Helper untuk parameterized queries PostgreSQL
// Menggantikan placeholder SQLite (?) dengan PostgreSQL ($1, $2, ...)

export class PgQueryBuilder {
  private conditions: string[] = [];
  private params: unknown[] = [];
  private paramIndex = 0;

  addCondition(sql: string, ...values: unknown[]): void {
    const placeholders = values.map(() => {
      this.paramIndex++;
      return `$${this.paramIndex}`;
    });
    // Replace all ? with numbered placeholders
    let idx = 0;
    const result = sql.replace(/\?/g, () => placeholders[idx++] || '?');
    this.conditions.push(result);
    this.params.push(...values);
  }

  addRaw(sql: string): void {
    this.conditions.push(sql);
  }

  getWhereClause(): string {
    return this.conditions.length > 0 ? `WHERE ${this.conditions.join(' AND ')}` : '';
  }

  getParams(): unknown[] {
    return this.params;
  }

  nextParam(): string {
    this.paramIndex++;
    return `$${this.paramIndex}`;
  }

  getParamCount(): number {
    return this.paramIndex;
  }
}
