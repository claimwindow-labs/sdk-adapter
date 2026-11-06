import {Keypair,Horizon,TransactionBuilder,Operation,Networks,Asset,Claimant,BASE_FEE} from '@stellar/stellar-sdk';
import fs from 'node:fs/promises';
const server=new Horizon.Server('https://horizon-testnet.stellar.org');
const pair=Keypair.random();
// Secrets live only in process memory. Public evidence contains no signing key.
const funding=await fetch('https://friendbot.stellar.org/?addr='+pair.publicKey());if(!funding.ok)throw new Error('Friendbot failed '+funding.status);
const account=await server.loadAccount(pair.publicKey());
const create=new TransactionBuilder(account,{fee:BASE_FEE,networkPassphrase:Networks.TESTNET}).addOperation(Operation.createClaimableBalance({asset:Asset.native(),amount:'1',claimants:[new Claimant(pair.publicKey(),Claimant.predicateUnconditional())]})).setTimeout(180).build();create.sign(pair);
const created=await server.submitTransaction(create);
const balances=await server.claimableBalances().claimant(pair.publicKey()).call();const id=balances.records[0]?.id;
if(!id)throw new Error('No balance ID from create result');
const before=await server.claimableBalances().claimableBalance(id).call();
const reload=await server.loadAccount(pair.publicKey());const claim=new TransactionBuilder(reload,{fee:BASE_FEE,networkPassphrase:Networks.TESTNET}).addOperation(Operation.claimClaimableBalance({balanceId:id})).setTimeout(180).build();claim.sign(pair);
const claimed=await server.submitTransaction(claim);
let removed=false;try{await server.claimableBalances().claimableBalance(id).call()}catch(e){removed=e.response?.status===404}
const evidence={network:'testnet',account:pair.publicKey(),balanceId:id,created:created.hash,claimed:claimed.hash,claimants:before.claimants,removed,recordedAt:new Date().toISOString(),scope:'Unconditional native-XLM create-and-claim flow only; time-boundary behavior covered locally.'};
await fs.writeFile('testnet-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
