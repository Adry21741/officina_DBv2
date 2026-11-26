-- Dati demo inventati. Eseguire dopo database.sql.
insert into customers(id,first_name,last_name,phone,email,address,contact_pref) values
('c1000000-0000-0000-0000-000000000001','Giulia','Marras','070 555 0142','giulia.marras@example.com','Via Roma 12, Oristano','telefono'),
('c1000000-0000-0000-0000-000000000002','Paolo','Cossu','333 555 0188',null,'Loc. Su Pranu, Paulilatino','whatsapp'),
('c1000000-0000-0000-0000-000000000003',null,'Azienda agricola Sa Corte','0785 555 023','info@sacorte.example.com','SP 15 km 4, Abbasanta','email');

insert into assets(id,customer_id,type,brand,model,plate,serial_number,year,displacement_cc,mileage_km,fuel) values
('a1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','motociclo','Honda','Hornet 600','FG482LP',null,2008,599,41200,'benzina'),
('a1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000002','motosega','Stihl','MS 261','',null,2019,50,null,'miscela 2%'),
('a1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000002','decespugliatore','Husqvarna','143R-II',null,'HQ143-2210045',2017,null,null,'miscela 2%'),
('a1000000-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000003','rasaerba','Honda','HRX 476',null,'HRX-9920311',2020,null,null,'benzina');
update assets set plate=null where plate='';

insert into work_orders(id,customer_id,asset_id,category,reported_problem,diagnosis,status,priority,due_date) values
('b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','Tagliando','Tagliando completo e rumore dalla catena.','Catena e pignone da sostituire.','in attesa di ricambi','alta',current_date+5),
('b1000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000002','Riparazione','Non si avvia a caldo.','Candela sporca, filtro aria intasato.','in lavorazione','normale',current_date+2),
('b1000000-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000004','Manutenzione','Lama da affilare, cambio olio.',null,'da verificare','urgente',current_date+1);

insert into work_order_events(work_order_id,event) values
('b1000000-0000-0000-0000-000000000001','ordine creato'),('b1000000-0000-0000-0000-000000000001','mezzo ricevuto'),
('b1000000-0000-0000-0000-000000000001','diagnosi completata'),('b1000000-0000-0000-0000-000000000001','ricambio richiesto');

insert into appointments(starts_at,duration_min,customer_id,asset_id,reason,status) values
(date_trunc('day',now())+interval '9 hours 30 minutes',60,'c1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000004','Consegna rasaerba','confermato'),
(date_trunc('day',now())+interval '1 day 16 hours',30,'c1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003','Controllo decespugliatore','prenotato');

insert into parts(id,code,oem_code,description,category,brand,supplier,qty_min,location) values
('d1000000-0000-0000-0000-000000000001','CAT-001','11270000','Catena di distribuzione Hornet 600','Motore','Honda','Ricambi Sardegna',2,'A1'),
('d1000000-0000-0000-0000-000000000002','CAN-014','4180-400-1800','Candela per motoseghe Stihl','Accensione','Stihl','Verde Service',5,'B2'),
('d1000000-0000-0000-0000-000000000003','FLT-007',null,'Filtro aria rasaerba HRX','Filtri','Honda','Verde Service',3,null),
('d1000000-0000-0000-0000-000000000004','OLI-002',null,'Olio 2T semisintetico 1 L','Lubrificanti','Generico','Verde Service',6,'C1');

insert into part_compatibilities(part_id,brand,model,year_from,year_to,status) values
('d1000000-0000-0000-0000-000000000001','Honda','Hornet 600',2007,2010,'verificata'),
('d1000000-0000-0000-0000-000000000002','Stihl','MS 261',2015,2022,'da controllare');

insert into purchase_orders(id,supplier,expected_date,status,work_order_id) values
('e1000000-0000-0000-0000-000000000001','Ricambi Sardegna',current_date+4,'ordinato','b1000000-0000-0000-0000-000000000001');
insert into purchase_order_items(purchase_order_id,part_id,qty_ordered) values
('e1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001',2);

-- Giacenze iniziali tramite movimenti (il trigger aggiorna parts.qty_on_hand)
insert into inventory_movements(part_id,kind,quantity,notes) values
('d1000000-0000-0000-0000-000000000002','carico',8,'Giacenza iniziale'),
('d1000000-0000-0000-0000-000000000003','carico',1,'Giacenza iniziale'),
('d1000000-0000-0000-0000-000000000004','carico',10,'Giacenza iniziale');
