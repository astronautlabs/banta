import "@alterior/platform-nodejs"
import { ChatMessage } from "@banta/common";
import { BotSession } from "./bot-session";

async function main(args: string[]) {
    let serverUrl = process.env.BANTA_URL;
    let token = process.env.TOKEN;

    let conversation = await BotSession.connect(serverUrl);

    conversation.connectionStateChanged.subscribe(state => console.log(`Connection state changed to '${state}'`));
    conversation.messageReceived.subscribe(async message => {
        console.log(`[${message.id}] <${message.user.username}> ${message.message}`);
        if (message.message.startsWith(`!8ball `)) {
            let options = [
                'Signs point to yes',
                'Signs point to no'
            ];

            await new Promise(r => setTimeout(r, 1000));
            conversation.reply(message, options[Math.random() * options.length | 0]);
        } else if (message.message.startsWith(`!load start`)) {
            startLoadTest(message);
        } else if (message.message.startsWith(`!load stop`)) {
            stopLoadTest();
        }
    });

    await conversation.authenticate(token);
    console.log(`Authenticated and ready!`);

    let loadTests = [];
    function startLoadTest(starter: ChatMessage) {
        loadTests.push(setInterval(async () => {
            let messages = [
                'Here is a test message',
                'How many test messages you gonna need? Use "!load start" again to spawn messages faster, use "!load stop" to end this madness',
                'Here is another test message',
                'Hopefully Banta will hold up!',
                'Product team kicks ass! Oh no.... am I moderated?',
                'House of the Dragon episode 2 was pretty cool',
                'Game of Thrones season 8 ruined the show for me.',
                'EXCELSIOR!',
                'Plenty more where that came from.',
                `I may be a bot, but that doesn't mean I don't have feelings`,
                `Imagine what we could do with these bots :-D`,
                `Can I do an emoji? Heck yeah! 🎉`,
                `Well, so far so good.`
            ];
            let text = messages[Math.random() * messages.length | 0];
            await conversation.send(<ChatMessage>{
                topicId: starter.topicId,
                parentMessageId: starter.parentMessageId,
                message: text
            });
        }, 100));
    }

    function stopLoadTest() {
        loadTests.forEach(lt => clearInterval(lt));
    }
}

main(process.argv.slice(2));