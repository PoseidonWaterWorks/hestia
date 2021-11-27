const infra = require('./network');
const community = new infra();

const previousBlockHash = '{insertid}]';
const currentBlockData = [
    {
        amount:10,
        sender:'{senderId}',
        recipient:'{recipientId}'
    },
    {
        amount:110,
        sender:'{senderId}',
        recipient:'{recipientId}'
    },
    {
        amount:120,
        sender:'{senderId}',
        recipient:'{recipientId}'
    }
]

console.log(community)