const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { register, login, createBoard, myBoards, deleteBoard,
    createTicket, getTickets,deleteTicket, board,updateBoard} = require('../controllers/controllers');

//registration and login
router.post('/register', register);
router.post('/login', login);

// board
router.post('/create-board',authMiddleware, createBoard)
router.get('/users/:email/boards',authMiddleware, myBoards);
router.get('/:boardId',authMiddleware, board);
router.put('/:boardId',authMiddleware, updateBoard);
router.delete('/delete-board/:boardId',authMiddleware, deleteBoard);


//ticket
router.post('/create-ticket', createTicket);
router.get('/tickets/:boardId', getTickets);
router.delete('/delete-ticket/:ticketId', deleteTicket);


module.exports = router;