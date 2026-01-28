# Quick Start Testing Guide - User Management Module

## ✅ Status Pre-verificat
- Backend: Compilat cu succes ✓
- Frontend: Compilat cu succes ✓
- Database: PostgreSQL rulează în Docker ✓

## 1. Pregătire Inițială

### Verifică dacă admin user există deja:
```bash
cd backend
docker exec -it workforce_postgres psql -U postgres -d workforce_db -c "SELECT email, role FROM users WHERE email = 'admin@workforce.com';"
```

### Dacă admin user NU există, creează-l:
```bash
cd backend
npm run seed:admin
```

## 2. Pornește Aplicațiile

### Terminal 1 - Backend:
```bash
cd backend
npm run start:dev
```
Așteaptă mesajul: `Application is running on: http://localhost:3000`

### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```
Deschide browser la: `http://localhost:5173`

## 3. Testare Rapidă Backend (API)

### Obține Token JWT:
```bash
export TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@workforce.com","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*"' \
  | cut -d'"' -f4)

echo "Token salvat: $TOKEN"
```

### Test 1: Obține lista utilizatori
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

### Test 2: Obține utilizator curent
```bash
curl -X GET http://localhost:3000/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

### Test 3: Creează utilizator test
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.user@workforce.com",
    "password": "Test123!",
    "fullName": "Test User",
    "phone": "+40712345678",
    "role": "ANGAJAT"
  }' \
  | jq .
```

### Test 4: Caută utilizatori
```bash
curl -X GET "http://localhost:3000/api/users?search=test" \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

### Test 5: Filtrare după role
```bash
curl -X GET "http://localhost:3000/api/users?role=ADMIN" \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

### Test 6: Statistici utilizatori
```bash
curl -X GET http://localhost:3000/api/users/stats \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

## 4. Testare Frontend (UI)

### Login:
1. Deschide http://localhost:5173
2. Login cu:
   - Email: `admin@workforce.com`
   - Password: `admin123`

### Testare Users Page:
1. Click pe Dashboard card "Gestionare Utilizatori" SAU
2. Navigate direct la http://localhost:5173/users

**Verifică:**
- ✅ Tabel cu lista utilizatori se încarcă
- ✅ Buton "Adaugă Utilizator" este vizibil (ADMIN only)
- ✅ Search bar funcționează
- ✅ Dropdown filtre: Rol, Departament, Status
- ✅ Pagination funcționează

### Test Creare User:
1. Click "Adaugă Utilizator"
2. Completează form:
   - Email: `newuser@test.com`
   - Password: `Test123!`
   - Full Name: `New Test User`
   - Role: `Angajat`
3. Click "Creează"
4. Verifică user apare în tabel

### Test Editare User:
1. Click pe butonul ⋮ (3 dots) la un user
2. Click "Editează"
3. Modifică Full Name
4. Click "Salvează"
5. Verifică modificarea în tabel

### Test Schimbare Parolă (Admin):
1. Click ⋮ la un user
2. Click "Schimbă Parola"
3. **Observă:** NU cere "Old Password" (admin privilege)
4. Introdu:
   - New Password: `NewTest123!`
   - Confirm Password: `NewTest123!`
5. Click "Schimbă Parola"
6. Verifică success message

### Test Toggle Status:
1. Click ⋮ la un active user
2. Click "Dezactivează"
3. Verifică status chip devine "Inactiv" (gray)

### Test Profil Propriu:
1. Navigate la http://localhost:5173/profile
2. Verifică:
   - ✅ Avatar afișat
   - ✅ Full Name, Email, Role
   - ✅ Departament (dacă există)
   - ✅ Last Login date
3. Click "Editează Profil"
4. Modifică un câmp
5. Click "Salvează"
6. Click "Schimbă Parola"
7. **Observă:** Cere "Old Password" (pentru propriul cont)

## 5. Testare Filtre și Search

### Search:
```
În Users Page:
1. Type "admin" în search bar
2. Verifică: tabelul se filtrează real-time
3. Type "test"
4. Verifică: găsește utilizatorii cu "test" în nume/email
```

### Filtre combinate:
```
1. Search: "test"
2. Role: "Angajat"
3. Status: "Activ"
4. Verifică: toate filtrele aplicate simultan
```

## 6. Testare Validări

### Parolă invalidă (fără uppercase):
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@workforce.com",
    "password": "test123",
    "fullName": "Test User 2",
    "role": "ANGAJAT"
  }'
```
**Expect:** 400 Bad Request

### Email duplicat:
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@workforce.com",
    "password": "Test123!",
    "fullName": "Duplicate Admin",
    "role": "ADMIN"
  }'
```
**Expect:** 409 Conflict

## 7. Cleanup După Testare

### Șterge utilizatori test:
```bash
# Găsește ID-ul userului test
TEST_USER_ID=$(curl -s -X GET "http://localhost:3000/api/users?search=test.user" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.[0].id')

# Șterge user
curl -X DELETE http://localhost:3000/api/users/$TEST_USER_ID \
  -H "Authorization: Bearer $TOKEN"
```

## 8. Troubleshooting

### Backend nu pornește:
```bash
# Verifică logs
cd backend
npm run start:dev

# Verifică migrații
npm run migration:run
```

### Frontend nu se conectează:
```bash
# Verifică .env
cd frontend
cat .env | grep VITE_API_URL
# Trebuie: VITE_API_URL=http://localhost:3000/api
```

### Token expirat:
```bash
# Re-login pentru token nou
export TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@workforce.com","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*"' \
  | cut -d'"' -f4)
```

### Database connection error:
```bash
# Verifică PostgreSQL
docker ps | grep postgres

# Dacă nu rulează:
cd docker
docker-compose up -d postgres
```

## 9. Checklist Testare Completă

### Backend API ✓
- [ ] GET /users - lista completă
- [ ] GET /users?search=term - search funcționează
- [ ] GET /users?role=ADMIN - filtrare role
- [ ] GET /users?isActive=true - filtrare status
- [ ] GET /users/me - user curent
- [ ] GET /users/stats - statistici
- [ ] POST /users - creare user
- [ ] PATCH /users/:id - update user
- [ ] PATCH /users/:id/password - schimbare parolă
- [ ] PATCH /users/:id/toggle-active - toggle status
- [ ] DELETE /users/:id - ștergere user

### Frontend UI ✓
- [ ] Login funcționează
- [ ] Dashboard afișează "Gestionare Utilizatori" (ADMIN/MANAGER)
- [ ] Users Page se încarcă
- [ ] Tabel afișează utilizatori
- [ ] Search real-time
- [ ] Filtre (role, department, status)
- [ ] Create User dialog + validare
- [ ] Edit User dialog
- [ ] Change Password dialog (admin - fără old password)
- [ ] Change Password dialog (user - cu old password)
- [ ] Toggle Status funcționează
- [ ] Delete User cu confirmare
- [ ] User Profile Page
- [ ] Edit profil propriu
- [ ] Navigation funcționează
- [ ] Loading states
- [ ] Error handling

### Securitate ✓
- [ ] Password hashing (bcrypt)
- [ ] JWT authentication
- [ ] Role-based authorization
- [ ] Email uniqueness
- [ ] Password complexity validation

## 10. Date de Test

### Admin User (creat cu seed):
- Email: `admin@workforce.com`
- Password: `admin123`
- Role: ADMIN

### Test User (creează manual):
- Email: `test.user@workforce.com`
- Password: `Test123!`
- Role: ANGAJAT

---

**Notă:** Pentru ghid complet cu toate scenariile de testare, vezi planul la:
`/Users/flaviustarta/.claude/plans/mighty-herding-lake.md`
