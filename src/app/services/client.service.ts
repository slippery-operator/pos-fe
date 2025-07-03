import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Client, ClientRequest } from "../models/client.model";

@Injectable({
    providedIn: 'root'
})
export class ClientService {
    private apiUrl = 'http://localhost:9000/clients';

    constructor(private http: HttpClient) {}

    getClients(): Observable<Client[]> {
        return this.http.get<Client[]>(this.apiUrl);
    }

    addClient(client: ClientRequest): Observable<Client> {
        return this.http.post<Client>(this.apiUrl, client);
    }
    updateClient(id: number, client: ClientRequest): Observable<Client> {
        return this.http.put<Client>(`${this.apiUrl}/${id}`, client)
    }
}