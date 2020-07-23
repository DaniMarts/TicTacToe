import React from 'react';
import Board from './Board';
import socketIOClient from "socket.io-client";
import WhatsAppLogo from "../whatsapp_logo.png";

// A function to determine the winner of the game
function calculateWinner(squares) {
    // lines contains all the possible ways of winning, i.e. adjacent squares (diagonally as well)
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      // if none of the 3 squares is empty and the adjacent squares have the same token (X or O)
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
          // return an array whose first element is the winner token, and the remaining elements, the way the game was won
        return [squares[a], a, b, c];
      }
    }
    return [null];
}
  
// the game is over when there is a winner or when all the squares have a token
const isGameOver = (squares) => (calculateWinner(squares)[0] || squares.every((square) => square!==null));

export default class Game extends React.Component {
  constructor(props){
    super(props);

    // default state of the game
    this.state = {
      socketID: null,
      gameStarted: false,
      gameOver: false,
      myTurn: false, 

      // current step in the game
      current: 0, 
      history: [
        {
          squares: [null, null, null, 
                    null, null, null, 
                    null, null, null],
          xIsNext: true  // the player who invited or started the game will be X
        }
      ],     
    };
  }

  componentDidMount(){
    // creating a webSocket that is associated with this Game component, so that it can be accessed from its other methods
    this.socket = socketIOClient();

    // This is so that the link to share is valid (contains a valid socketID to join, instead of null) 
    this.socket.on('connect', () => {
      console.log(this.socket.id);
      this.setState({
        ...this.state,
        socketID: this.socket.id
      });
    });

    // the socketToJoinID is a hint to the room to join. We get it from the URL, if the user joined from a link
    let socketToJoinID = window.location.pathname.replace("/join/:", '');
    // if a socket id was passed in the url
    if (socketToJoinID !== '/') {
      // tell the server that this socket is ready to join a room
      this.socket.emit('ready', socketToJoinID);
      console.log("Joining", socketToJoinID);

      // the user who joins an existing game will be O, second to play
      this.setState(
        {
          ...this.state, 
          myTurn: false
      });
    }
    else // if no socket id was passed, this is the first player by default
      this.setState(
        {
          ...this.state,  
          myTurn: true
      });

  
    this.socket.on("start game", () => {
      // starting the game on this side when the room is full
      console.log("game started");
      this.setState({
        ...this.state,
        gameStarted: true
      });
    });

    this.socket.on("new game", () => this.handleNewGame());

    // When someone plays, the square number that was played is sent
    this.socket.on("play", square => {
      // writing the changes the other user did on the board to this board
      this.handlePlay(square);
      console.log("the other player has played on square", square);

      // now this user can play
      this.setState(
        {
          ...this.state,  // the state is the same, expcept for the following modifications
          myTurn: true
      });
    });

    // when a user leaves, the active user's page is refreshed, so that the option to share is back
    this.socket.on("player left", () => window.location.pathname = '/');
  }


  // Describes what happens when someone plays on square #i
  handlePlay(i, callback = ()=>{}){
    let current = this.state.current;  // the number of the current state
    const squares = [...this.state.history[current].squares];
    
    if (!squares[i]){ /*so that the square only changes if there's nothing there */
      // now that the square has been clicked, it should be filled with either X or O, according to the current game step
      squares[i] = this.state.history[current].xIsNext? 'X' : 'O';
      this.setState(state => {
        return ({
          ...state,  // the state is the same, except for the following modifications
          gameOver: isGameOver(squares),
          history: [...state.history, {squares: squares, xIsNext: !state.history[current].xIsNext}],
          current: current + 1  // incrementing the game step
        });
      }, callback());
    }
  }

  // A method that describes what happens when square #i is clicked
  handleClick(i) {
    // checking if the game is currently not over
    if (!this.state.gameOver){
      this.handlePlay(i, ()=>{  // buggy

        console.log("I have played on square", i);
        // after this user has played, it will not be this user's turn to play
        this.setState(state => {
          return {
            ...state,
            myTurn: false
          }}, 
          // letting the other player know that a move has been made
          () => this.socket.emit('play', i)      
        );
      });
    }
  } 
  
  handleNewGame(callback = () => {}){
    this.setState(state => {
      return {
        ...state,
        gameOver: false, 
        current: 0, 
        history: [state.history[0]],
        myTurn: false
      }}, 
      () => callback());
  }


  jumpTo(move){
    var stepsNumber = this.state.history.length;
    this.setState({
      ...this.state,
      current: move,
      gameOver: stepsNumber-1 === move && stepsNumber !== 1, // the game cannot be over if there has only been one step
    });
  }

  
  render() {
    // the status of the game: Who won, or whether it was a draw
    let status;
    
    var winner = (calculateWinner(this.state.history[this.state.current].squares));
    // If the game is over and there is no winner, it's a draw. winner[0] is either X or O
    if (this.state.gameOver && (winner[0]===null)){
      status = "Draw";
    }
    else{
      status = winner[0] ? `${winner[0]} won!`: `Next player: ${this.state.history[this.state.current].xIsNext? 'X' : 'O'}`;
    }
    
    // remeber that the winner array returned from calculateWinner shows how the game was won in elements 1 to 3 of the array
    let squaresToHighlight = winner[0] ? winner.slice(1, 4) : [];  // if there is no winner, there are no squares to highlight

    const moves = this.state.history.map((step, move) => {
      // If move is not 0 display the number in the step change buttons, otherwise, display Go to game start in the button 
      const description = move? `Go to move #${move}` : "Go to game start";

      /*this func returns a list of buttons. Button of current step will be bold */
      const className = this.state.current === move? "bold" : "none";
      return (
        <li key={move}>
          <button onClick={() => this.jumpTo(move)} className={className}>{description}</button>
        </li>
      )
    });
    
    // Hide the Undo button if the current step is 0
    if (this.state.current === 0)
      var displayUndo = {visibility: "hidden"};
    
    // Hide the redo button if the game is in the latest played step
    if (this.state.current === this.state.history.length-1)
      var displayRedo = {visibility: "hidden"};
    
    // if the game hasn't been played, disable the New Game button
    if (this.state.history.length === 1)
      var disableNewGame = true;
    
    
    return (
        <div className="game">
          <div className="game-board">
            <Board 
              state={this.state.history[this.state.current]} 
              onClick={(i) => this.handleClick(i)}
              gamePlayable={this.state.gameStarted && !this.state.gameOver && this.state.myTurn}
              toHighlight={squaresToHighlight}
            />
          </div>
          
          <div className="game-info">
            <div>{status}</div>
            <button 
              onClick={()=> this.setState({...this.state, gameOver: false, current: (this.state.current)-1})}
              style={displayUndo}
            >
              Undo
            </button>
            
            <button 
              onClick={()=>this.setState({...this.state, current: (this.state.current)+1})}
              style={displayRedo}
            >
              Redo
            </button>
            
            <button 
              onClick={() => {
                this.handleNewGame(() => {
                  this.socket.emit("new game");
                  this.setState(state => {return {...state, myTurn: true}});
                });   
              }}

              disabled={disableNewGame}>
              New game
            </button>
            
            <ol>{moves}</ol>
          </div>
          
          <div className="share" style={{display: this.state.gameStarted ? "none" : "block"}}>
            <p>Share link</p>
            <div display="inline">
              <a href={`https://wa.me/?text=${window.location.href+"join/:"+encodeURIComponent(this.state.socketID)}`} target='_blank' rel="noopener noreferrer">       
                <img src={WhatsAppLogo} alt="Share with WhatsApp" title="Share with WhatsApp"/>   
              </a>

              <button
                id="copy"
                style={{display: navigator.clipboard ? "inline" : "none"}}
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(window.location.href+"join/:"+encodeURIComponent(this.state.socketID)).then(
                    function() { /* clipboard successfully set */ }, 
                    function() {
                      alert(`Your browser does not support copying to the clipboard. Here is the link:\n ${window.location.href+"join/:"+encodeURIComponent(this.state.socketID)}`);
                    })
                  }
                  catch (err) {
                    alert(`Your browser does not support copying to the clipboard. Here is the link:\n ${window.location.href+"join/:"+encodeURIComponent(this.state.socketID)}`);

                  }
                  }}
                >
                  {
                    navigator.clipboard ? "Copy to clipboard" : window.location.href+"join/:"+encodeURIComponent(this.state.socketID)
                  }
              </button>

              <span
                style={{display: navigator.clipboard ? "none" : "inline"}}>
                {window.location.href+"join/:"+encodeURIComponent(this.state.socketID)}
              </span>
            </div>
          </div>
        </div>
    );
  }
}
