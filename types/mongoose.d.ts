declare module 'mongoose' {
        export class Schema<T = any> {
                constructor(def?: any);
                static Types: any;
        }
        export interface Document { markModified?: any; save?: any; [key: string]: any; }
        export type Model<T> = any;
       export function model<T = any>(name: string, schema?: any): Model<T>;
       const mongoose: { model: typeof model };
        export default mongoose;
}
