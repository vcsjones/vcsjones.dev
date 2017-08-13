require 'digest'

module VCSJones
    class RetinaTag < Liquid::Tag
        def render(context)
           '<div class="retina">'
        end
    end

    class EndRetinaTag < Liquid::Tag 
        def render(context)
            '</div>'
        end
    end
end

Liquid::Template.register_tag('retina', VCSJones::RetinaTag)
Liquid::Template.register_tag('endretina', VCSJones::EndRetinaTag)