const express = require('express');
const router = express.Router();
const { register, login, createBoard, myBoards,createTicket, getTickets} = require('../controllers/controllers');

router.post('/register', register);
router.post('/login', login);
router.post('/create-board', createBoard)
router.get('/users/:email/boards', myBoards);;
router.post('/create-ticket', createTicket);
router.get('/tickets/:boardId', getTickets);


module.exports = router;