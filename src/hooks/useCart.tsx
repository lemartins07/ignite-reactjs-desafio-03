import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
       // verificar se o produto já está no carrinho       
      const productAreadyExists = cart.find(product => product.id === productId);
      
      if (!productAreadyExists){
         // se não, buscar o produto e o stock na api
        const { data: product }= await api.get<Product>(`products/${productId}`);
        const { data: stock }= await api.get<Stock>(`stock/${productId}`);     

        // verifica se o stock e maior que zero
        if (stock.amount > 0 ) {
          // se sim, atualiza o estado com o novo produto e a quantidade de
          const updatedCart = [...cart, {...product, amount: 1} ];         
          
          setCart(updatedCart);
          // salva no local store o estado do carrinho
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        }
      }  

      // se o produto existir:
      if (productAreadyExists) {
        // consulta o estoque, 
        const { data: stock }= await api.get<Stock>(`stock/${productId}`);  

        //se estoque for maior que a quantidade do produto no carrinho:
        if (stock.amount > productAreadyExists.amount){
          // percorre o estado com map gravando em outra variavel 
          const updateCart = cart.map(cartItem => (
            // procurando o produto, se encontra:
            cartItem.id === productAreadyExists.id) ?
            // adiciona o conteudo do produto e atualiza a quantidade
            {
              ...cartItem,
              amount: Number(productAreadyExists.amount + 1)              
              // se não, retorna o produto      
            } : cartItem
          );
          // atualiza o estado com o retorno do map
          setCart(updateCart);          
          // grava o localstorage com o retorno do map
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }     
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productAreadyExists = cart.find(product => product.id === productId);

      if(!productAreadyExists){
        toast.error('Erro na remoção do produto');
        return;
      }

      const updateCart = cart.filter(cartItem => cartItem.id !== productId);     
      
      setCart(updateCart);
      // salva no local store o estado do carrinho
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      console.log(amount);
      
      const productAreadyExists = cart.find(product => product.id === productId);
      
      if (!productAreadyExists){        
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }
      //const updateProductAmount = productAreadyExists.amount - amount;      
      if (amount <= 0 ) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }      
      
      // consulta o estoque,          
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);
      
      //se estoque for maior que a quantidade do produto no carrinho:
      if (stock.amount < amount){                 
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }      
          
      // percorre o estado com map gravando em outra variavel 
      const updateCart = cart.map(cartItem => (
        // procurando o produto, se encontra:
        cartItem.id === productId) ?
        // adiciona o conteudo do produto e atualiza a quantidade
        {
          ...cartItem,
          amount: amount   
          // se não, retorna o produto      
        } : cartItem
      );

      // atualiza o estado com o retorno do map
      setCart(updateCart);          
      // grava o localstorage com o retorno do map
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
                     
      
      
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
