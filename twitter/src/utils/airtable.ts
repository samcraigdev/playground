import Airtable from "airtable";

const apiKey: string = ((process.env.AIRTABLE_API_KEY as string) = "keyBJdKITu32YpMFf");
const baseId: string = ((process.env.AIRTABLE_BASE_ID as string) = "app6yOelRF8qNFBXH");

export type Base = Airtable.Base;
export type Row<T> = Airtable.Row<T>;
export type Rows<T> = readonly Airtable.Row<T & object>[];
export type Table<T> = Airtable.Table<T & Airtable.FieldSet>;
export type Query<T> = Airtable.Query<T & object>;

export type Fields = {
  "Instagram Profile"?: string;
	"Instagram Followers"?: number;
	"Instagram Last Updated"?: string;
	"Instagram Errors"?: string;
};

export class ClientFactory {
	private readonly table: Table<Fields>;
	private readonly base: Base;

	constructor(table: string) {
    this.base = new Airtable().base(baseId);
    this.table = this.base(table);
	}

	async getRecords(options: Airtable.SelectOptions): Promise<Rows<Fields>> {
		const selection = this.table.select(options);
		const records: Rows<Fields> = await selection.all();
		return records;
	}
	
	async getRecordsForTag(tag: string) {
		const filterByFormula = this.createTagFilterFormula(tag);
		const records = await this.getRecords({ filterByFormula })
		return records;
	}

	async getRecordsForView(view: string) {
		const records = await this.getRecords({ view })
		return records;
	}
  
  async updateRecordWithFields(id: string, fields: Fields): Promise<Row<Fields>> {
    return await this.table.update(id, fields);
  }

	createTagFilterFormula(tag: string): string {
		return `NOT(SEARCH("${tag}", {Tags (General)}) = 0)`;
	}
}

export default ClientFactory;
