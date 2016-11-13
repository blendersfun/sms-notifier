
import {
    Sheet,
    ISheetConfig
} from './sheet';

export class Contact {
    person: string;
    phone: string;
    email: string;
    groups: string[];
    estimated: number;
    lastFive: string[];
    points: number;
}

export class ContactsSheet extends Sheet<Contact> {
    protected constructor(
        protected config: ISheetConfig<Contact>
    ) {
        super(config);
    }

    protected static headings = {
        person:    { title: 'Roommate' },
        phone:     { title: 'Phone', transform: d => '+1' + d.replace(/[^\d]/g, '') },
        email:     { title: 'Email' },
        groups:    { title: 'Groups',    transform: Sheet.listTx },
        estimated: { title: 'Estimated', transform: Sheet.durationTx }, // Total estimated for current year.
        lastFive:  { title: 'Last Five', transform: Sheet.listTx },
        points:    { title: 'Points',    transform: Sheet.intTx }
    };

    protected static keyBy = 'person';

    protected static range = 'A1:F';

    public getContacts(): { [value: string]: Contact } {
        return this.config.indexedData;
    }
}
