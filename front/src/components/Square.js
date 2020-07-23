import React from 'react';

export default function Square(props){
    return (
        <button 
          className={props.className} 
          onClick={props.onClick}
          disabled={props.disabled}
        > 
          {props.value}
        </button> 
    );
}