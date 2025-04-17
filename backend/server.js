import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 3001;
const SEGRETO = 'supersegreto'; // da cambiare in produzione

app.use(cors());
app.use(bodyParser.json());

// Database (in memoria per esempio)
let casse = [
  {
    id: 1,
    codice: 'CASSA-001',
    posizione: 'Scaffale A1',
    destinazioneUso: 'Equipaggiamento di emergenza',
    categoria: 'elettroutensili',
    codiceQR: 'https://example.com/cassa/1',
    materiali: [
      { id: 'mat1', nome: 'Trapano', peso: 3.2, descrizione: 'Trapano elettrico professionale' },
      { id: 'mat2', nome: 'Martello', peso: 2, descrizione: 'Martello da carpentiere' }
    ]
  },
  {
    id: 2,
    codice: 'CASSA-002',
    posizione: 'Scaffale B1',
    destinazioneUso: 'Equipaggiamento di scorta',
    categoria: 'sicurezza',
    codiceQR: 'https://example.com/cassa/2',
    materiali: [
      { id: 'mat3', nome: 'Estintore', peso: 5, descrizione: 'Estintore a polvere' }
    ]
  }
];

// === Login ===
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  // Esempio rudimentale: admin/admin
  if (username === 'admin' && password === 'admin') {
    const token = jwt.sign({ username }, SEGRETO, { expiresIn: '1h' });
    return res.json({ token });
  }
  res.status(401).json({ errore: 'Credenziali non valide' });
});

// Middleware di autenticazione
const verificaToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SEGRETO, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// === GET /api/casse (visualizzazione) ===
app.get('/api/casse', verificaToken, (req, res) => {
  res.json(casse);
});

// === GET /api/casse/:id (dettagli cassa) ===
app.get('/api/casse/:id', verificaToken, (req, res) => {
  const id = parseInt(req.params.id);
  const cassa = casse.find(c => c.id === id);
  if (!cassa) {
    return res.status(404).json({ errore: 'Cassa non trovata' });
  }
  res.json(cassa);
});

// === POST /api/casse (aggiungere una nuova cassa) ===
app.post('/api/casse', verificaToken, (req, res) => {
  const nuovaCassa = {
    ...req.body,
    id: Date.now(), // genera un id unico
    materiali: req.body.materiali || []
  };
  casse.push(nuovaCassa);
  res.json(nuovaCassa);
});

// === PUT /api/casse/:id (aggiornare una cassa) ===
app.put('/api/casse/:id', verificaToken, (req, res) => {
  const id = parseInt(req.params.id);
  const index = casse.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ errore: 'Cassa non trovata' });
  }
  // Aggiorna i dati
  casse[index] = { ...casse[index], ...req.body };
  res.json(casse[index]);
});

// === DELETE /api/casse/:id (rimuovere una cassa) ===
app.delete('/api/casse/:id', verificaToken, (req, res) => {
  const id = parseInt(req.params.id);
  const index = casse.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ errore: 'Cassa non trovata' });
  }
  const rimossa = casse.splice(index, 1)[0];
  res.json(rimossa);
});

// === SPOSTARE un materiale da una cassa all’altra ===
app.post('/api/sposta-materiale', verificaToken, (req, res) => {
  const { idCassaOrigine, idCassaDestinazione, idMateriale } = req.body;
  const cassaOrigine = casse.find(c => c.id === idCassaOrigine);
  const cassaDest = casse.find(c => c.id === idCassaDestinazione);

  if (!cassaOrigine || !cassaDest) {
    return res.status(404).json({ errore: 'Cassa di origine o destinazione non trovata' });
  }

  // Trova il materiale da spostare
  const indexMat = cassaOrigine.materiali.findIndex(m => m.id === idMateriale);
  if (indexMat === -1) {
    return res.status(404).json({ errore: 'Materiale non trovato nella cassa di origine' });
  }

  // Rimuovi materiale da cassaOrigine
  const [materialeSpostato] = cassaOrigine.materiali.splice(indexMat, 1);

  // Aggiungilo a cassaDest
  cassaDest.materiali.push(materialeSpostato);

  res.json({ origineAggiornata: cassaOrigine, destinazioneAggiornata: cassaDest });
});

// Avvio server
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
// Aggiungi un array in memoria per i bancali
let bancali = [];

// Endpoint per creare un bancale
app.post('/api/pallets', verificaToken, (req, res) => {
  const nuovoBancale = {
    id: req.body.id,
    casse: [], // inizialmente vuoto; potresti aggiungere la logica per associare 6 casse
    pesoTotale: 0
  };
  bancali.push(nuovoBancale);
  res.json(nuovoBancale);
});
