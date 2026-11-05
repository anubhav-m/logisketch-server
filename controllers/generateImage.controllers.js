import { diagramService } from "../services/diagram.services.js";
import { callKroki } from "../services/kroki.services.js";

export const generateImage = async (req, res, next) => {

    try {
        const { prompt, engine } = req.body;

        const { code } = await diagramService.generateDiagramCode({
            text: prompt.text,
            image: prompt.image,
            engine,
        });

        const svg = await callKroki(code, engine);

        res.status(200).json({ success: true, code, svg });
    }

    catch (err) {
        next(err);
    }

}
