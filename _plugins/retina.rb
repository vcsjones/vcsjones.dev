require 'digest'

module VCSJones
    class RetinaTag < Liquid::Tag
        def initialize(tag_name, markup, tokens)
            super
            @attributes = {}
            markup.scan(Liquid::TagAttributes) do |key, value|
                @attributes[key.to_sym] = value.gsub(/^'|"/, '').gsub(/'|"$/, '')
            end
        end

        def render(context)
            "<img class='retina' src='#{@attributes[:src]}' title='#{@attributes[:caption]}' />"
        end
    end
end

Liquid::Template.register_tag('imgretina', VCSJones::RetinaTag)