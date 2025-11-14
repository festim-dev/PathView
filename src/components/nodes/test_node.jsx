import "@xyflow/react/dist/style.css";

import { Handle, Position } from '@xyflow/react';
import { LabeledHandle } from '@/components/labeled-handle';
import { Button } from "@/components/ui/button";
import {
    BaseNode,
    BaseNodeContent,
    BaseNodeFooter,
    BaseNodeHeader,
    BaseNodeHeaderTitle,
} from "@/components/nodes/base-node";
import { Rocket } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../ui/accordion";

export default function TestNode({ data }) {
    return (

        <BaseNode className="w-96 px-0 py-0">
            <LabeledHandle
                id="3"
                title="Test3"
                type="source"
                position={Position.Right}
            />
            <LabeledHandle
                id="1"
                title="Test1"
                type="source"
                position={Position.Bottom}
            />
            <BaseNodeHeader>
                <Rocket className="size-4" />
                <BaseNodeHeaderTitle>Header</BaseNodeHeaderTitle>

            </BaseNodeHeader>
            {/* <BaseNodeContent className="px-5 py-0">
                <h3 className="text-lg font-bold">Content</h3>
                <p className="text-xs">
                    This is a full-featured node with a header, content, and footer. You
                    can customize it as needed.
                </p>
            </BaseNodeContent> */}


            {/* <BaseNodeFooter>
                <h4 className="text-md self-start font-bold">Footer</h4>

                <Button variant="outline" className="nodrag w-full">
                    Action 1
                </Button>

            </BaseNodeFooter> */}
            <Accordion type="single" collapsible>
                <AccordionItem value="help">
                    <AccordionTrigger className="text-xs font-mono py-2">
                        Examples & Help
                    </AccordionTrigger>
                    <AccordionContent className="overflow-hidden">
                        <div className="flex flex-col gap-3 text-xs font-mono">
                            <div>
                                <div className="font-semibold mb-2">Examples:</div>
                                <div className="space-y-1 text-muted-foreground">
                                    <div>
                                        • <code>sound("bd sd hh sd")</code>
                                    </div>
                                    <div>
                                        • <code>n("0 2 4 2").scale("C4:major")</code>
                                    </div>
                                    <div>
                                        • <code>sound("bd*2 sd").gain(0.8)</code>
                                    </div>
                                    <div>
                                        • <code>note("c3 eb3 g3").slow(2)</code>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="font-semibold mb-2">Tips:</div>
                                <div className="space-y-1 text-muted-foreground">
                                    <div>
                                        • Use <code>sound()</code> for samples
                                    </div>
                                    <div>
                                        • Use <code>n().scale()</code> for melodies
                                    </div>
                                    <div>
                                        • Use <code>note()</code> for specific notes
                                    </div>
                                    <div>
                                        • Chain effects: <code>.gain().lpf()</code>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="font-semibold mb-2">Learn More:</div>
                                <div className="text-muted-foreground">
                                    Visit{' '}
                                    <a
                                        href="https://strudel.cc"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:text-blue-600 underline"
                                    >
                                        strudel.cc
                                    </a>{' '}
                                    for full documentation
                                </div>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </BaseNode>

    );
}