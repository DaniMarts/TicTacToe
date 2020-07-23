import React from 'react';
import Square from './Square';

export default class Board extends React.Component {
    renderSquare(i) {
      return (<Square 
                value={this.props.state.squares[i]}
                onClick={() => this.props.onClick(i)}
                className={this.props.toHighlight.includes(i)? "square won" : "square"}
                key={i}
                disabled={!this.props.gamePlayable}
               />
              );
    }
  
    render() {
      let j=0, 
      board = (
          <div>
             {[0,1,2].map((i)=>            
                <div className="board-row" key={i}>
                  {['','',''].map(()=> this.renderSquare(j++))}
                </div>
            )}
          </div>
        );
      return board;
    }
}
  